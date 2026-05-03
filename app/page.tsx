"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDatabaseStats, getAllDonors, getVisitsWithDonor } from './lib/db';
import { getSyncStats } from './lib/sync';
import { subscribeToNetwork } from './lib/network';
import type { SyncStatus } from './lib/types';
import NetworkStatus from './components/NetworkStatus';
import SyncStatusBadge from './components/SyncStatusBadge';

export default function Dashboard() {
  const [stats, setStats] = useState({
    donors: { total: 0, synced: 0, pending: 0 },
    visits: { total: 0, synced: 0, pending: 0 },
    queue: { total: 0 },
    lastSync: null as number | null,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    const unsubscribe = subscribeToNetwork((state) => {
      setIsOnline(state.isOnline && !state.isForcedOffline);
    });

    // Refresh every 10 seconds
    const interval = setInterval(loadDashboardData, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dbStats, syncStats, donors, visits] = await Promise.all([
        getDatabaseStats(),
        getSyncStats(),
        getAllDonors(),
        getVisitsWithDonor(),
      ]);

      setStats({
        donors: dbStats.donors,
        visits: dbStats.visits,
        queue: dbStats.queue,
        lastSync: syncStats.lastSyncAt,
      });

      // Get recent activity (last 5 items)
      const recentDonors = donors
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3)
        .map(d => ({ type: 'donor', name: `${d.firstName} ${d.lastName}`, date: d.createdAt, status: d.syncStatus }));

      const recentVisits = visits
        .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
        .slice(0, 3)
        .map(v => ({ 
          type: 'visit', 
          name: v.donor ? `${v.donor.firstName} ${v.donor.lastName}` : 'Unknown', 
          date: new Date(v.visitDate).getTime(),
          status: v.syncStatus 
        }));

      setRecentActivity([...recentDonors, ...recentVisits].sort((a, b) => b.date - a.date).slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400 mt-2">Blood Bank Management System Overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/donors" className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
            <div className="text-3xl font-bold text-white">{isLoading ? '-' : stats.donors.total}</div>
            <div className="text-slate-400 text-sm mt-1">Total Donors</div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-green-400">{stats.donors.synced} synced</span>
              <span className="text-slate-600">|</span>
              <span className="text-yellow-400">{stats.donors.pending} pending</span>
            </div>
          </Link>

          <Link href="/visits" className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
            <div className="text-3xl font-bold text-white">{isLoading ? '-' : stats.visits.total}</div>
            <div className="text-slate-400 text-sm mt-1">Total Visits</div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-green-400">{stats.visits.synced} synced</span>
              <span className="text-slate-600">|</span>
              <span className="text-yellow-400">{stats.visits.pending} pending</span>
            </div>
          </Link>

          <Link href="/sync" className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
            <div className={`text-3xl font-bold ${stats.queue.total > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {isLoading ? '-' : stats.queue.total}
            </div>
            <div className="text-slate-400 text-sm mt-1">Sync Queue</div>
            <div className="mt-2 text-xs text-slate-500">
              {stats.lastSync ? `Last: ${formatTime(stats.lastSync)}` : 'Never synced'}
            </div>
          </Link>

          <div className={`p-6 rounded-lg border transition-colors ${isOnline ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
            <div className="flex items-center justify-between">
              <div className={`text-3xl font-bold ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <NetworkStatus />
            </div>
            <div className={`text-sm mt-1 ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
              {isOnline ? 'Ready to sync' : 'Working offline'}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/donors/new" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2">
              <span>+</span>
              <span>New Donor</span>
            </Link>
            <Link href="/visits/new" className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex items-center gap-2">
              <span>+</span>
              <span>Record Visit</span>
            </Link>
            <Link href="/sync" className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors flex items-center gap-2">
              <span>↻</span>
              <span>Sync Now</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {isLoading ? (
            <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-slate-400">Loading...</span>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
              <p className="text-slate-400">No recent activity</p>
              <p className="text-slate-500 text-sm mt-2">Add a donor or record a visit to get started</p>
              <div className="flex gap-3 justify-center mt-4">
                <Link href="/donors/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                  Add Donor
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              {recentActivity.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      item.type === 'donor' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {item.type === 'donor' ? 'D' : 'V'}
                    </div>
                    <div>
                      <div className="font-medium text-white">{item.name}</div>
                      <div className="text-sm text-slate-400 capitalize">{item.type} added {formatTime(item.date)}</div>
                    </div>
                  </div>
                  <SyncStatusBadge status={item.status as SyncStatus} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offline Info */}
        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h3 className="font-semibold text-blue-400 mb-2">Offline-First Architecture</h3>
          <p className="text-slate-400 text-sm">
            This prototype demonstrates offline-first functionality. All data is stored locally in IndexedDB 
            and synchronized with the server when online. You can continue working offline and sync later.
          </p>
          <div className="flex gap-4 mt-4 text-xs text-slate-500">
            <span>✓ Works offline</span>
            <span>✓ Auto-sync when online</span>
            <span>✓ Queue-based sync</span>
            <span>✓ Conflict resolution</span>
          </div>
        </div>
      </div>
    </div>
  );
}
