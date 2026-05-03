// app/donors/page.tsx
// List all local donors with sync status badges

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllDonors } from '../lib/db';
import { Donor } from '../lib/types';
import SyncStatusBadge from '../components/SyncStatusBadge';

export default function DonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'synced' | 'failed'>('all');

  useEffect(() => {
    loadDonors();
  }, []);

  const loadDonors = async () => {
    try {
      const data = await getAllDonors();
      setDonors(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load donors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDonors = filter === 'all' 
    ? donors 
    : donors.filter(d => {
        if (filter === 'pending') return d.syncStatus === 'pending' || d.syncStatus === 'local_only';
        return d.syncStatus === filter;
      });

  const stats = {
    total: donors.length,
    synced: donors.filter(d => d.syncStatus === 'synced').length,
    pending: donors.filter(d => d.syncStatus === 'pending' || d.syncStatus === 'local_only').length,
    failed: donors.filter(d => d.syncStatus === 'failed').length,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Donors</h1>
            <p className="text-slate-400 mt-1">Manage blood donors and their information</p>
          </div>
          <Link
            href="/donors/new"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>New Donor</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-sm">Total Donors</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-3xl font-bold text-green-400">{stats.synced}</div>
            <div className="text-slate-400 text-sm">Synced</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-slate-400 text-sm">Pending</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-3xl font-bold text-red-400">{stats.failed}</div>
            <div className="text-slate-400 text-sm">Failed</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(['all', 'pending', 'synced', 'failed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Donors List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 mt-4">Loading donors...</p>
          </div>
        ) : filteredDonors.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-lg">No donors found</p>
            <p className="text-slate-500 mt-2">
              {filter === 'all' 
                ? 'Get started by adding your first donor' 
                : `No ${filter} donors found`}
            </p>
            {filter === 'all' && (
              <Link
                href="/donors/new"
                className="inline-block mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Add Donor
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Donor</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Blood Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Contact</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Donations</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonors.map((donor) => (
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
                      <div className="text-sm text-slate-500">{donor.city}</div>
                    </td>
                    <td className="px-6 py-4">
                      <SyncStatusBadge status={donor.syncStatus} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">{donor.totalDonations}</div>
                      {donor.lastDonationDate && (
                        <div className="text-sm text-slate-500">
                          Last: {donor.lastDonationDate}
                        </div>
                      )}
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
