// app/visits/new/page.tsx
// New visit form, links to local donors via dropdown

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDonorSummaries } from '../../lib/db';
import { createVisit, getDonor } from '../../lib/db';
import { queueVisitSync } from '../../lib/sync';
import { DonorSummary, Visit } from '../../lib/types';

const visitTypes = ['donation', 'checkup', 'deferral'];
const statuses = ['pending', 'completed', 'deferred', 'rejected'];

export default function NewVisitPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [donors, setDonors] = useState<DonorSummary[]>([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState(true);
  const [selectedDonor, setSelectedDonor] = useState<DonorSummary | null>(null);

  useEffect(() => {
    loadDonors();
  }, []);

  const loadDonors = async () => {
    try {
      const data = await getDonorSummaries();
      setDonors(data);
    } catch (error) {
      console.error('Failed to load donors:', error);
    } finally {
      setIsLoadingDonors(false);
    }
  };

  const handleDonorChange = (donorLocalId: string) => {
    const donor = donors.find(d => d.localId === donorLocalId) || null;
    setSelectedDonor(donor);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const donorLocalId = formData.get('donorLocalId') as string;

    if (!donorLocalId) {
      setError('Please select a donor');
      setIsSubmitting(false);
      return;
    }

    try {
      // Get the full donor to include their blood type
      const donor = await getDonor(donorLocalId);
      if (!donor) {
        throw new Error('Selected donor not found');
      }

      // Generate visit number
      const visitNumber = `VIS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const visitData = {
        visitNumber,
        visitDate: formData.get('visitDate') as string,
        visitType: formData.get('visitType') as 'donation' | 'checkup' | 'deferral',
        donorLocalId,
        weight: parseFloat(formData.get('weight') as string) || 0,
        bloodPressureSystolic: parseInt(formData.get('bloodPressureSystolic') as string) || 0,
        bloodPressureDiastolic: parseInt(formData.get('bloodPressureDiastolic') as string) || 0,
        pulse: parseInt(formData.get('pulse') as string) || 0,
        temperature: parseFloat(formData.get('temperature') as string) || 0,
        hemoglobin: parseFloat(formData.get('hemoglobin') as string) || 0,
        bloodBagNumber: formData.get('bloodBagNumber') as string,
        bloodVolume: parseInt(formData.get('bloodVolume') as string) || 0,
        status: formData.get('status') as 'pending' | 'completed' | 'deferred' | 'rejected',
        deferralReason: formData.get('deferralReason') as string || null,
        deferralUntil: (formData.get('deferralUntil') as string) || null,
        registeredBy: formData.get('registeredBy') as string,
        screenedBy: formData.get('screenedBy') as string,
        collectedBy: formData.get('collectedBy') as string,
        notes: formData.get('notes') as string,
      };

      // Create visit in IndexedDB
      const visit = await createVisit(visitData);
      
      // Queue for sync
      await queueVisitSync('CREATE', visit);

      // Navigate to visits list
      router.push('/visits');
    } catch (err) {
      console.error('Failed to create visit:', err);
      setError(err instanceof Error ? err.message : 'Failed to create visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Record New Visit</h1>
          <p className="text-slate-400 mt-2">Enter visit information below</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Donor Selection */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Donor Selection</h2>
            {isLoadingDonors ? (
              <div className="text-center py-4">
                <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-slate-400">Loading donors...</span>
              </div>
            ) : donors.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-400">No donors available. Please add a donor first.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Donor *
                  </label>
                  <select
                    name="donorLocalId"
                    required
                    onChange={(e) => handleDonorChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Choose a donor</option>
                    {donors.map((donor) => (
                      <option key={donor.localId} value={donor.localId}>
                        {donor.donorNumber} - {donor.firstName} {donor.lastName} ({donor.bloodType})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDonor && (
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Name:</span>
                        <span className="ml-2 text-white">{selectedDonor.firstName} {selectedDonor.lastName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Blood Type:</span>
                        <span className="ml-2 text-red-400 font-medium">{selectedDonor.bloodType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Donor #:</span>
                        <span className="ml-2 text-white">{selectedDonor.donorNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Sync:</span>
                        <span className={`ml-2 ${
                          selectedDonor.syncStatus === 'synced' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {selectedDonor.syncStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Visit Information */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Visit Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Visit Date *
                </label>
                <input
                  type="date"
                  name="visitDate"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Visit Type *
                </label>
                <select
                  name="visitType"
                  required
                  defaultValue="donation"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {visitTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status *
                </label>
                <select
                  name="status"
                  required
                  defaultValue="pending"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Vitals</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="70.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Blood Pressure (mmHg)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="bloodPressureSystolic"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="120"
                  />
                  <span className="text-slate-500">/</span>
                  <input
                    type="number"
                    name="bloodPressureDiastolic"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="80"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Pulse (bpm)
                </label>
                <input
                  type="number"
                  name="pulse"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="72"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="temperature"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="37.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Hemoglobin (g/dL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="hemoglobin"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="13.5"
                />
              </div>
            </div>
          </div>

          {/* Donation Details */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Donation Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Blood Bag Number
                </label>
                <input
                  type="text"
                  name="bloodBagNumber"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="BB-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Blood Volume (mL)
                </label>
                <input
                  type="number"
                  name="bloodVolume"
                  defaultValue="450"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="450"
                />
              </div>
            </div>
          </div>

          {/* Staff */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Staff Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Registered By
                </label>
                <input
                  type="text"
                  name="registeredBy"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Staff name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Screened By
                </label>
                <input
                  type="text"
                  name="screenedBy"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Staff name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Collected By
                </label>
                <input
                  type="text"
                  name="collectedBy"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Staff name"
                />
              </div>
            </div>
          </div>

          {/* Deferral */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Deferral Information (if applicable)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Deferral Reason
                </label>
                <input
                  type="text"
                  name="deferralReason"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Reason for deferral"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Deferred Until
                </label>
                <input
                  type="date"
                  name="deferralUntil"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Additional Information</h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Any additional notes about the visit..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting || donors.length === 0}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Record Visit'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-slate-600 hover:border-slate-500 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
