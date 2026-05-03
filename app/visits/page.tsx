// app/visits/page.tsx
// List all local visits with donor info and sync status

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getVisitsWithDonor, getAllDonors } from '../lib/db';
import { VisitWithDonor, Visit } from '../lib/types';
import SyncStatusBadge from '../components/SyncStatusBadge';

export default function VisitsPage() {
  const [visits, setVisits] = useState<VisitWithDonor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'synced' | 'failed'>('all');
  const [hasDonors, setHasDonors] = useState(false);

  useEffect(() => {
    loadVisits();
    checkDonors();
  }, []);

  const loadVisits = async () => {
    try {
      const data = await getVisitsWithDonor();
      setVisits(data.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()));
    } catch (error) {
      console.error('Failed to load visits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDonors = async () => {
    try {
      const donors = await getAllDonors();
      setHasDonors(donors.length > 0);
    } catch (error) {
      console.error('Failed to check donors:', error);
    }
  };

  const filteredVisits = filter === 'all' 
    ? visits 
    : visits.filter(v => {
        if (filter === 'pending') return v.syncStatus === 'pending' || v.syncStatus === 'local_only';
        return v.syncStatus === filter;
      });

  const stats = {
    total: visits.length,
    synced: visits.filter(v => v.syncStatus === 'synced').length,
    pending: visits.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'local_only').length,
    failed: visits.filter(v => v.syncStatus === 'failed').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'deferred': return 'bg-orange-500/20 text-orange-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Visits</h1>
            <p className="text-slate-400 mt-1">Manage blood donation visits and records</p>
          </div>
          <Link
            href={hasDonors ? "/visits/new" : "/donors/new"}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>New Visit</span>
          </Link>
        </div>

        {!hasDonors && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400">
            <p className="font-medium">No donors available</p>
            <p className="text-sm mt-1">Please add a donor before recording visits.</p>
            <Link href="/donors/new" className="inline-block mt-2 text-sm underline hover:no-underline">
              Add Donor →
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-sm">Total Visits</div>
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

        {/* Visits List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 mt-4">Loading visits...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-lg">No visits found</p>
            <p className="text-slate-500 mt-2">
              {filter === 'all' 
                ? 'Get started by recording your first visit' 
                : `No ${filter} visits found`}
            </p>
            {filter === 'all' && hasDonors && (
              <Link
                href="/visits/new"
                className="inline-block mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Record Visit
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Visit</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Donor</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Sync</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map((visit) => (
                  <tr
                    key={visit.localId}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{visit.visitNumber}</div>
                      <div className="text-sm text-slate-400 capitalize">{visit.visitType}</div>
                    </td>
                    <td className="px-6 py-4">
                      {visit.donor ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-semibold">
                            {visit.donor.firstName[0]}{visit.donor.lastName[0]}
                          </div>
                          <div>
                            <div className="text-white">{visit.donor.firstName} {visit.donor.lastName}</div>
                            <div className="text-sm text-slate-400">{visit.donor.donorNumber}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">Unknown Donor</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">{visit.visitDate}</div>
                      {visit.bloodVolume > 0 && (
                        <div className="text-sm text-slate-500">{visit.bloodVolume}mL</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(visit.status)}`}>
                        {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <SyncStatusBadge status={visit.syncStatus} size="sm" />
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
