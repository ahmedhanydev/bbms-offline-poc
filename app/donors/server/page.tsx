// app/donors/server/page.tsx
// Search and view server-synced donors (works offline)

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchDonors } from '../../lib/db';
import { Donor } from '../../lib/types';
import { fetchDonorsFromServer } from '../../lib/sync';
import { isOnline } from '../../lib/network';
import SyncStatusBadge from '../../components/SyncStatusBadge';

export default function ServerDonorsPage() {
  const router = useRouter();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadDonors();

    // Auto-fetch from server on mount if online
    if (isOnline()) {
      handleSyncFromServer();
    }
  }, []);

  const loadDonors = async (query: string = '') => {
    setIsLoading(true);
    try {
      const data = await searchDonors(query);
      // Only show donors that came from server (have remoteId or are synced)
      const serverDonors = data.filter(
        d => d.remoteId !== null && d.syncStatus === 'synced'
      );
      setDonors(serverDonors.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load donors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    loadDonors(query);
  };

  const handleSyncFromServer = async () => {
    setIsSyncing(true);
    try {
      const result = await fetchDonorsFromServer();
      if (result.success) {
        console.log('[ServerDonors] Synced', result.count, 'donors');
        loadDonors(searchQuery);
      } else {
        console.error('[ServerDonors] Sync failed:', result.error);
      }
    } catch (err) {
      console.error('[ServerDonors] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white mb-4 flex items-center gap-2"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold">Server Donors</h1>
            <p className="text-slate-400 mt-1">
              Search donors fetched from server — works offline
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSyncFromServer}
              disabled={isSyncing}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>{isSyncing ? '⟳' : '↓'}</span>
              <span>{isSyncing ? 'Syncing...' : 'Sync from Server'}</span>
            </button>
            <Link
              href="/donors/new"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>+</span>
              <span>New Donor</span>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search by name, donor number, blood type, city, phone, national ID..."
              className="w-full px-4 py-3 pl-12 bg-slate-800 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-slate-500"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
              🔍
            </span>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-slate-400 text-sm">
          {isLoading ? 'Loading...' : `${donors.length} donor${donors.length !== 1 ? 's' : ''} found`}
        </div>

        {/* Donors Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 mt-4">Loading donors...</p>
          </div>
        ) : donors.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-lg">No server donors found</p>
            <p className="text-slate-500 mt-2">
              {searchQuery
                ? 'Try a different search term'
                : 'Click "Sync from Server" to fetch donors'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Donor</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Blood Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Contact</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">City</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((donor) => (
                  <tr
                    key={donor.localId}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold">
                          {donor.firstName[0]}{donor.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {donor.firstName} {donor.lastName}
                          </div>
                          <div className="text-sm text-slate-400">{donor.donorNumber}</div>
                          <div className="text-xs text-slate-500">ID: {donor.nationalId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                        {donor.bloodType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">{donor.phone}</div>
                      {donor.email && (
                        <div className="text-sm text-slate-500">{donor.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">{donor.city}</div>
                    </td>
                    <td className="px-6 py-4">
                      <SyncStatusBadge status={donor.syncStatus} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
