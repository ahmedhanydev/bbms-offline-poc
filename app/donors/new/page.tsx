// app/donors/new/page.tsx
// New donor form - saves to IndexedDB

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDonor } from '../../lib/db';
import { queueDonorSync } from '../../lib/sync';
import { Donor, BloodType, Gender } from '../../lib/types';

const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders: Gender[] = ['male', 'female'];

export default function NewDonorPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      // Generate donor number
      const donorNumber = `DON-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const donorData = {
        donorNumber,
        nationalId: formData.get('nationalId') as string,
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        dateOfBirth: formData.get('dateOfBirth') as string,
        gender: formData.get('gender') as Gender,
        bloodType: formData.get('bloodType') as BloodType,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        emergencyContactName: formData.get('emergencyContactName') as string,
        emergencyContactPhone: formData.get('emergencyContactPhone') as string,
        lastDonationDate: null,
        totalDonations: 0,
        isEligible: true,
        notes: formData.get('notes') as string,
      };

      // Create donor in IndexedDB
      const donor = await createDonor(donorData);
      
      // Queue for sync
      await queueDonorSync('CREATE', donor);

      // Navigate to donors list
      router.push('/donors');
    } catch (err) {
      console.error('Failed to create donor:', err);
      setError(err instanceof Error ? err.message : 'Failed to create donor');
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
          <h1 className="text-3xl font-bold">Register New Donor</h1>
          <p className="text-slate-400 mt-2">Enter donor information below</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  National ID *
                </label>
                <input
                  type="text"
                  name="nationalId"
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Gender *
                </label>
                <select
                  name="gender"
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select gender</option>
                  {genders.map(g => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Blood Type *
                </label>
                <select
                  name="bloodType"
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select blood type</option>
                  {bloodTypes.map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="john@example.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="New York"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="+1 234 567 8901"
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
                placeholder="Any additional notes about the donor..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Register Donor'}
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
