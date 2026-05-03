// app/sync/page.tsx
// Sync dashboard: network status, queue length, last sync time, failed count, manual sync button, conflict list

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSyncQueue, getDatabaseStats } from '../lib/db';
import { processSyncQueue, getSyncStats, setSyncCallbacks, isSyncInProgress, getLastSyncTime } from '../lib/sync';
import { isOnline, subscribeToNetwork, NetworkState } from '../lib/network';
import { SyncQueueItem, SyncStats, SyncConflict, SyncStatus } from '../lib/types';
import NetworkStatus from '../components/NetworkStatus';
import SyncStatusBadge from '../components/SyncStatusBadge';

export default function SyncPage() {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [queueData, syncStats] = await Promise.all([
        getSyncQueue(),
        getSyncStats(),
      ]);
      setQueue(queueData);
      setStats(syncStats);
      setLastSync(getLastSyncTime());
    } catch (error) {
      console.error('Failed to load sync data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Subscribe to network changes
    const unsubscribe = subscribeToNetwork((state) => {
      setNetworkState(state);
    });

    // Set up sync callbacks
    setSyncCallbacks({
      onSyncStart: () => setIsSyncing(true),
      onSyncComplete: (result) => {
        setIsSyncing(false);
        setConflicts(result.conflicts);
        setSyncMessage(`Synced ${result.syncedCount} items, ${result.failedCount} failed`);
        loadData();
      },
      onSyncError: (error) => {
        setIsSyncing(false);
        setSyncMessage(`Sync failed: ${error.message}`);
      },
      onConflict: (conflict) => {
        setConflicts(prev => [...prev, conflict]);
      },
    });

    // Refresh every 5 seconds
    const interval = setInterval(loadData, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadData]);

  const handleManualSync = async () => {
    if (!isOnline()) {
      setSyncMessage('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      await processSyncQueue();
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const getRelativeTime = (timestamp: number | null) => {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const dbStats = stats ? {
    donors: {
      total: stats.syncedCount + stats.pendingCount + stats.failedCount,
      synced: Math.max(0, stats.syncedCount - (stats.failedCount + stats.pendingCount)),
      pending: stats.pendingCount,
      failed: stats.failedCount,
    },
    visits: {
      total: stats.queueLength,
      synced: 0,
      pending: stats.queueLength,
      failed: 0,
    },
  } : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sync Dashboard</h1>
          <p className="text-slate-400 mt-2">Monitor synchronization status and manage offline data</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Network Status */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-4">Network</h3>
            <NetworkStatus />
            {networkState?.lastOnlineAt && (
              <div className="mt-2 text-xs text-slate-500">
                Last online: {formatTime(networkState.lastOnlineAt)}
              </div>
            )}
          </div>

          {/* Last Sync */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Last Sync</h3>
            <div className="text-2xl font-bold text-white">
              {lastSync ? getRelativeTime(lastSync) : 'Never'}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {formatTime(lastSync)}
            </div>
          </div>

          {/* Queue Length */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Queue Length</h3>
            <div className="text-2xl font-bold text-yellow-400">
              {stats?.queueLength || 0}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              items pending sync
            </div>
          </div>

          {/* Failed Count */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Failed</h3>
            <div className={`text-2xl font-bold ${(stats?.failedCount || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats?.failedCount || 0}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              items need attention
            </div>
          </div>
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            syncMessage.includes('failed') 
              ? 'bg-red-500/20 border border-red-500/50 text-red-400'
              : 'bg-green-500/20 border border-green-500/50 text-green-400'
          }`}>
            {syncMessage}
            <button 
              onClick={() => setSyncMessage(null)}
              className="float-right text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Manual Sync Button */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline()}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <span>↻</span>
                <span>Sync Now</span>
              </>
            )}
          </button>
          {!isOnline() && (
            <span className="text-yellow-400 text-sm">
              Cannot sync while offline
            </span>
          )}
        </div>

        {/* Database Stats */}
        {dbStats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Database Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-medium mb-4">Donors</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total</span>
                    <span className="font-medium">{dbStats.donors.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Synced</span>
                    <span className="font-medium text-green-400">{dbStats.donors.synced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pending</span>
                    <span className="font-medium text-yellow-400">{dbStats.donors.pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Failed</span>
                    <span className="font-medium text-red-400">{dbStats.donors.failed}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-lg font-medium mb-4">Sync Queue</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Items</span>
                    <span className="font-medium">{queue.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Donors to Sync</span>
                    <span className="font-medium text-yellow-400">
                      {queue.filter(i => i.entityType === 'donor').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Visits to Sync</span>
                    <span className="font-medium text-yellow-400">
                      {queue.filter(i => i.entityType === 'visit').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Failed Retries</span>
                    <span className="font-medium text-red-400">
                      {queue.filter(i => i.lastError !== null).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sync Queue */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Sync Queue</h2>
          {queue.length === 0 ? (
            <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
              <p className="text-slate-400">Sync queue is empty</p>
              <p className="text-slate-500 text-sm mt-2">All items are synchronized</p>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Operation</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Entity</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Queued</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Retries</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.id} className="border-b border-slate-700/50">
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          item.operation === 'CREATE' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {item.operation}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="capitalize text-slate-300">{item.entityType}</span>
                        {item.dependencies.length > 0 && (
                          <span className="text-xs text-yellow-400 ml-2">
                            (waiting for {item.dependencies.length} deps)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-400 text-sm">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className={item.retryCount > 0 ? 'text-yellow-400' : 'text-slate-400'}>
                          {item.retryCount}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {item.lastError ? (
                          <span className="text-red-400 text-sm" title={item.lastError}>
                            Error (hover)
                          </span>
                        ) : (
                          <span className="text-green-400 text-sm">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-red-400">Conflicts ({conflicts.length})</h2>
            <div className="bg-slate-800 rounded-lg border border-red-500/50 overflow-hidden">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="p-4 border-b border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white capitalize">
                      {conflict.entityType} Conflict
                    </span>
                    <span className="text-sm text-slate-400">
                      {new Date(conflict.detectedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Local version: {conflict.localVersion} | Server version: {conflict.serverVersion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
