// app/donors/[localId]/edit/page.tsx
// Edit donor form - fix sync errors and retry

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getDonor, updateDonor } from '../../../lib/db';
import { queueDonorSync } from '../../../lib/sync';
import { Donor, BloodType, Gender } from '../../../lib/types';

const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders: Gender[] = ['male', 'female'];

export default function EditDonorPage() {
  const router = useRouter();
  const params = useParams();
  const localId = params.localId as string;

  const [donor, setDonor] = useState<Donor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [donorNumber, setDonorNumber] = useState('');

  // Parse which fields caused duplicate errors from syncError
  const duplicateFields = (() => {
    const fields = new Set<string>();
    if (!donor?.syncError) return fields;
    const err = donor.syncError.toLowerCase();
    if (err.includes('donornumber') || err.includes('donor number')) fields.add('donorNumber');
    if (err.includes('nationalid') || err.includes('national id')) fields.add('nationalId');
    return fields;
  })();

  useEffect(() => {
    loadDonor();
  }, [localId]);

  const loadDonor = async () => {
    setIsLoading(true);
    try {
      const data = await getDonor(localId);
      if (!data) {
        setError('Donor not found');
        return;
      }
      setDonor(data);
      setDonorNumber(data.donorNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load donor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!donor) return;

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);

    // Client-side validation for API-required fields
    const errors: Record<string, string> = {};
    const nationalId = formData.get('nationalId') as string;
    const dateOfBirth = formData.get('dateOfBirth') as string;
    const gender = formData.get('gender') as string;
    const bloodType = formData.get('bloodType') as string;
    const phone = formData.get('phone') as string;

    if (!nationalId?.trim()) errors.nationalId = 'national id مطلوب إدخاله.';
    if (!dateOfBirth) errors.dateOfBirth = 'date of birth مطلوب إدخاله.';
    if (!gender) errors.gender = 'gender مطلوب إدخاله.';
    if (!bloodType) errors.bloodType = 'blood type مطلوب إدخاله.';
    if (!phone?.trim()) errors.phone = 'رقم الهاتف مطلوب إدخاله.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      // Auto-generate new donorNumber if the old one was a duplicate
      let newDonorNumber = donorNumber;
      if (duplicateFields.has('donorNumber')) {
        newDonorNumber = `DON-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      }

      const updates = {
        donorNumber: newDonorNumber,
        nationalId,
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        dateOfBirth,
        gender: gender as Gender,
        bloodType: bloodType as BloodType,
        phone,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        emergencyContactName: formData.get('emergencyContactName') as string,
        emergencyContactPhone: formData.get('emergencyContactPhone') as string,
        notes: formData.get('notes') as string,
        // Reset sync status and clear error
        syncStatus: 'pending' as const,
        syncError: undefined,
      };

      const updatedDonor = await updateDonor(localId, updates);

      // Re-queue for sync
      await queueDonorSync('UPDATE', updatedDonor);

      router.push('/donors');
    } catch (err) {
      console.error('Failed to update donor:', err);
      setError(err instanceof Error ? err.message : 'Failed to update donor');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 mt-4">Loading donor...</p>
        </div>
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="min-h-screen bg-slate-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error || 'Donor not found'}
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold">Edit Donor</h1>
          <p className="text-slate-400 mt-2">
            Fix errors and retry sync for <strong>{donor.donorNumber}</strong>
          </p>
          {donor.syncError && (
            <div className="mt-3 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              <div className="font-semibold mb-1">⚠️ Sync Failed — Duplicate Fields Detected</div>
              <div className="text-sm">{donor.syncError}</div>
              {duplicateFields.size > 0 && (
                <div className="mt-2 text-sm text-yellow-300">
                  You must change these fields before retrying:
                  <span className="font-bold"> {Array.from(duplicateFields).join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Donor Number
                  {duplicateFields.has('donorNumber') && (
                    <span className="ml-2 text-yellow-400 text-xs">(duplicate — will auto-generate on save)</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="donorNumber"
                    value={donorNumber}
                    onChange={(e) => setDonorNumber(e.target.value)}
                    className={`flex-1 px-4 py-2 bg-slate-700 border ${duplicateFields.has('donorNumber') ? 'border-yellow-500' : 'border-slate-600'} rounded-lg focus:border-blue-500 focus:outline-none text-white`}
                  />
                  <button
                    type="button"
                    onClick={() => setDonorNumber(`DON-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`)}
                    className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm transition-colors"
                  >
                    🔄 New
                  </button>
                </div>
                {duplicateFields.has('donorNumber') && (
                  <p className="text-yellow-400 text-sm mt-1">This donor number already exists on the server. Click "New" or leave it to auto-generate.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  defaultValue={donor.firstName}
                  className={`w-full px-4 py-2 bg-slate-700 border ${fieldErrors.firstName ? 'border-red-500' : 'border-slate-600'} rounded-lg focus:border-blue-500 focus:outline-none text-white`}
                />
                {fieldErrors.firstName && <p className="text-red-400 text-sm mt-1">{fieldErrors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  defaultValue={donor.lastName}
                  className={`w-full px-4 py-2 bg-slate-700 border ${fieldErrors.lastName ? 'border-red-500' : 'border-slate-600'} rounded-lg focus:border-blue-500 focus:outline-none text-white`}
                />
                {fieldErrors.lastName && <p className="text-red-400 text-sm mt-1">{fieldErrors.lastName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  National ID <span className="text-red-400">*</span>
                  {duplicateFields.has('nationalId') && (
                    <span className="ml-2 text-yellow-400 text-xs">(duplicate — must change)</span>
                  )}
                </label>
                <input
                  type="text"
                  name="nationalId"
                  defaultValue={donor.nationalId}
                  className={`w-full px-4 py-2 bg-slate-700 border ${fieldErrors.nationalId ? 'border-red-500' : duplicateFields.has('nationalId') ? 'border-yellow-500' : 'border-slate-600'} rounded-lg focus:border-blue-500 focus:outline-none text-white`}
                />
                {fieldErrors.nationalId && <p className="text-red-400 text-sm mt-1">{fieldErrors.nationalId}</p>}
                {duplicateFields.has('nationalId') && !fieldErrors.nationalId && (
                  <p className="text-yellow-400 text-sm mt-1">This national ID is already registered. Enter a unique value.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Date of Birth <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  defaultValue={donor.dateOfBirth}
                  className={`w-full px-4 py-2 bg-slate-700 border ${fieldErrors.dateOfBirth ? 'border-red-500' : 'border-slate-600'} rounded-lg focus:border-blue-500 focus:outline-none text-white`}
                />
                {fieldErrors.dateOfBirth && <p className="text-red-400 text-sm mt-1">{fieldErrors.dateOfBirth}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Gender <span className="text-red-400">*</span>
                </label>
                <select
                  name="gender"
                  defaultValue={donor.gender}
                  className={`w-full px-4 py-2 bg-slate-700 border ${fieldErrors.gender ? 'border-red-500' : 'border-slate-600'} rounded-lg focus:border-blue-500 focus:outline-none text-white`}
                >
                  <option value="">Select gender</option>
                  {genders.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {fieldErrors.gender && <p className="text-red-400 text-sm mt-1">{fieldErrors.gender}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Blood Type <span className="text-red-400">*</span>
                </label>
                <select
                  name="bloodType"
                  defaultValue={donor.bloodType}
                  className={`w-full px-4 py-2 bg-slate-700 border ${fieldErrors.bloodType ? 'border-red-500' : 'border-slate-600'} rounded-lg focus:border-blue-500 focus:outline-none text-white`}
                >
                  <option value="">Select blood type</option>
                  {bloodTypes.map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
                {fieldErrors.bloodType && <p className="text-red-400 text-sm mt-1">{fieldErrors.bloodType}</p>}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={donor.phone}
                  className={`w-full px-4 py-2 bg-slate-700 border ${fieldErrors.phone ? 'border-red-500' : 'border-slate-600'} rounded-lg focus:border-blue-500 focus:outline-none text-white`}
                />
                {fieldErrors.phone && <p className="text-red-400 text-sm mt-1">{fieldErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={donor.email}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={donor.address}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  defaultValue={donor.city}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  defaultValue={donor.emergencyContactName}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  defaultValue={donor.emergencyContactPhone}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Notes</h2>
            <textarea
              name="notes"
              rows={3}
              defaultValue={donor.notes}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save & Retry Sync'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
