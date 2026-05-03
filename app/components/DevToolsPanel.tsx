// app/components/DevToolsPanel.tsx
// Collapsible panel for debugging: local records, sync queue, logs, server state

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDatabaseStats, getAllDonors, getAllVisits, getSyncQueue, clearAllData } from '../lib/db';
import SyncStatusBadge from './SyncStatusBadge';
import { processSyncQueue, getSyncStats } from '../lib/sync';
import { isOnline, checkServerConnection } from '../lib/network';

type Tab = 'stats' | 'donors' | 'visits' | 'queue' | 'logs';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: string;
}

export default function DevToolsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<any>(null);
  const [donors, setDonors] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [serverStatus, setServerStatus] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Add log entry
  const addLog = useCallback((level: LogEntry['level'], message: string, details?: string) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      level,
      message,
      details,
    }, ...prev].slice(0, 100)); // Keep last 100 logs
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    try {
      const [dbStats, allDonors, allVisits, queueItems, syncStats] = await Promise.all([
        getDatabaseStats(),
        getAllDonors(),
        getAllVisits(),
        getSyncQueue(),
        getSyncStats(),
      ]);
      
      setStats({ ...dbStats, sync: syncStats });
      setDonors(allDonors);
      setVisits(allVisits);
      setQueue(queueItems);
      
      // Check server status
      const online = await checkServerConnection();
      setServerStatus(online);
      
      addLog('info', 'Data refreshed');
    } catch (error) {
      addLog('error', 'Failed to refresh data', String(error));
    }
  }, [addLog]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen, refreshData]);

  // Handle sync
  const handleSync = async () => {
    if (!isOnline()) {
      addLog('warn', 'Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    addLog('info', 'Starting sync...');
    
    try {
      const result = await processSyncQueue();
      addLog('info', `Sync complete`, `Synced: ${result.syncedCount}, Failed: ${result.failedCount}`);
      refreshData();
    } catch (error) {
      addLog('error', 'Sync failed', String(error));
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear all data
  const handleClearData = async () => {
    if (confirm('Are you sure? This will delete all local data!')) {
      try {
        await clearAllData();
        addLog('info', 'All data cleared');
        refreshData();
      } catch (error) {
        addLog('error', 'Failed to clear data', String(error));
      }
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stats', label: 'Stats' },
    { id: 'donors', label: `Donors (${donors.length})` },
    { id: 'visits', label: `Visits (${visits.length})` },
    { id: 'queue', label: `Queue (${queue.length})` },
    { id: 'logs', label: 'Logs' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors z-50"
      >
        DevTools
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[600px] h-[400px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800 rounded-t-lg">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-white">DevTools</span>
          <div className="flex items-center gap-2 text-xs">
            <span className={serverStatus ? 'text-green-400' : 'text-red-400'}>
              ● Server {serverStatus ? 'OK' : 'Down'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={refreshData}
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
            title="Refresh"
          >
            ↻
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 p-3 rounded">
                <h4 className="text-slate-400 text-sm mb-2">Donors</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total: <span className="text-white">{stats.donors.total}</span></div>
                  <div>Synced: <span className="text-green-400">{stats.donors.synced}</span></div>
                  <div>Pending: <span className="text-yellow-400">{stats.donors.pending}</span></div>
                  <div>Failed: <span className="text-red-400">{stats.donors.failed}</span></div>
                </div>
              </div>
              <div className="bg-slate-800 p-3 rounded">
                <h4 className="text-slate-400 text-sm mb-2">Visits</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total: <span className="text-white">{stats.visits.total}</span></div>
                  <div>Synced: <span className="text-green-400">{stats.visits.synced}</span></div>
                  <div>Pending: <span className="text-yellow-400">{stats.visits.pending}</span></div>
                  <div>Failed: <span className="text-red-400">{stats.visits.failed}</span></div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 p-3 rounded">
              <h4 className="text-slate-400 text-sm mb-2">Sync Queue</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>Total: <span className="text-white">{stats.queue.total}</span></div>
                <div>Pending: <span className="text-yellow-400">{stats.queue.pending}</span></div>
                <div>Failed: <span className="text-red-400">{stats.queue.failed}</span></div>
              </div>
              {stats.sync?.lastSyncAt && (
                <div className="text-xs text-slate-500 mt-2">
                  Last sync: {new Date(stats.sync.lastSyncAt).toLocaleString()}
                </div>
              )}
            </div>
            <button
              onClick={handleClearData}
              className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded border border-red-600/30"
            >
              Clear All Local Data
            </button>
          </div>
        )}

        {/* Donors Tab */}
        {activeTab === 'donors' && (
          <div className="space-y-2">
            {donors.length === 0 ? (
              <div className="text-slate-500 text-center py-8">No donors found</div>
            ) : (
              donors.map(donor => (
                <div key={donor.localId} className="bg-slate-800 p-3 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">
                      {donor.firstName} {donor.lastName}
                    </span>
                    <SyncStatusBadge status={donor.syncStatus} size="sm" />
                  </div>
                  <div className="text-slate-400 mt-1">
                    {donor.donorNumber} • {donor.bloodType}
                  </div>
                  <div className="text-slate-500 text-xs mt-1 font-mono">
                    Local: {donor.localId.slice(0, 8)}...
                    {donor.remoteId && ` • Remote: ${donor.remoteId}`}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Visits Tab */}
        {activeTab === 'visits' && (
          <div className="space-y-2">
            {visits.length === 0 ? (
              <div className="text-slate-500 text-center py-8">No visits found</div>
            ) : (
              visits.map(visit => (
                <div key={visit.localId} className="bg-slate-800 p-3 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{visit.visitNumber}</span>
                    <SyncStatusBadge status={visit.syncStatus} size="sm" />
                  </div>
                  <div className="text-slate-400 mt-1">
                    {visit.visitDate} • {visit.status} • {visit.visitType}
                  </div>
                  <div className="text-slate-500 text-xs mt-1 font-mono">
                    Local: {visit.localId.slice(0, 8)}...
                    {visit.remoteId && ` • Remote: ${visit.remoteId}`}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="space-y-2">
            {queue.length === 0 ? (
              <div className="text-slate-500 text-center py-8">Queue is empty</div>
            ) : (
              queue.map(item => (
                <div key={item.id} className="bg-slate-800 p-3 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">
                      {item.operation} {item.entityType}
                    </span>
                    <span className="text-xs text-slate-400">
                      Retry: {item.retryCount}
                    </span>
                  </div>
                  <div className="text-slate-400 mt-1">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  {item.lastError && (
                    <div className="text-red-400 text-xs mt-1">
                      Error: {item.lastError}
                    </div>
                  )}
                  {item.dependencies.length > 0 && (
                    <div className="text-yellow-400 text-xs mt-1">
                      Waiting for: {item.dependencies.length} dependencies
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-1 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-8">No logs yet</div>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={`p-2 rounded ${
                    log.level === 'error' ? 'bg-red-900/20' :
                    log.level === 'warn' ? 'bg-yellow-900/20' :
                    'bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      'text-green-400'
                    }>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-white">{log.message}</span>
                  </div>
                  {log.details && (
                    <div className="text-slate-400 mt-1 pl-16">{log.details}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
