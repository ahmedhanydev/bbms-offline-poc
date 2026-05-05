// app/lib/types.ts
// TypeScript interfaces for BBMS Offline-First POC

export type SyncStatus = 'local_only' | 'pending' | 'synced' | 'failed' | 'conflict';
export type EntityType = 'donor' | 'visit';
export type OperationType = 'CREATE' | 'UPDATE';

// Blood type enum
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

// Gender enum
export type Gender = 'male' | 'female';

// Donor interface
export interface Donor {
  // Local fields (always present)
  localId: string;           // UUID generated locally
  remoteId: number | null;     // Server-assigned ID after sync
  syncStatus: SyncStatus;
  syncError?: string;          // Last sync error message (for failed items)
  createdAt: number;           // Unix timestamp (ms)
  updatedAt: number;         // Unix timestamp (ms)
  version: number;           // For conflict detection
  
  // Business fields
  donorNumber: string;       // Unique donor identifier (e.g., DON-2024-001)
  nationalId: string;        // National ID number
  firstName: string;
  lastName: string;
  dateOfBirth: string;       // ISO date string (YYYY-MM-DD)
  gender: Gender;
  bloodType: BloodType;
  phone: string;
  email: string;
  address: string;
  city: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  
  // Metadata
  lastDonationDate: string | null;
  totalDonations: number;
  isEligible: boolean;
  notes: string;
}

// Visit/Donation interface
export interface Visit {
  // Local fields (always present)
  localId: string;           // UUID generated locally
  remoteId: number | null;   // Server-assigned ID after sync
  donorLocalId: string;      // FK to local donor
  donorRemoteId: number | null; // FK to remote donor (after donor syncs)
  syncStatus: SyncStatus;
  syncError?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  
  // Business fields
  visitNumber: string;       // Unique visit identifier
  visitDate: string;         // ISO date string
  visitType: 'donation' | 'checkup' | 'deferral';
  
  // Vitals
  weight: number;            // kg
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  pulse: number;
  temperature: number;      // Celsius
  hemoglobin: number;       // g/dL
  
  // Donation details
  bloodBagNumber: string;
  bloodVolume: number;      // mL (usually 450 or 0 for deferrals)
  
  // Status
  status: 'pending' | 'completed' | 'deferred' | 'rejected';
  deferralReason: string | null;
  deferralUntil: string | null; // ISO date string
  
  // Staff
  registeredBy: string;
  screenedBy: string;
  collectedBy: string;
  
  // Notes
  notes: string;
}

// Sync queue item for tracking pending operations
export interface SyncQueueItem {
  id: string;                // Unique queue item ID (UUID)
  operation: OperationType;
  entityType: EntityType;
  localId: string;          // FK to the entity being synced
  payload: string;          // JSON stringified entity data
  timestamp: number;        // When queued
  retryCount: number;
  lastError: string | null;
  dependencies: string[];   // Array of localIds that must sync first (e.g., donor before visit)
}

// Network status
export interface NetworkState {
  isOnline: boolean;
  isForcedOffline: boolean; // User can force offline mode for testing
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
}

// Sync statistics
export interface SyncStats {
  lastSyncAt: number | null;
  queueLength: number;
  failedCount: number;
  pendingCount: number;
  syncedCount: number;
  conflicts: SyncConflict[];
}

// Sync conflict for resolution
export interface SyncConflict {
  id: string;
  entityType: EntityType;
  localId: string;
  localVersion: number;
  serverVersion: number;
  localData: Donor | Visit;
  serverData: Donor | Visit;
  detectedAt: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Donor summary for dropdowns/lists
export interface DonorSummary {
  localId: string;
  remoteId: number | null;
  donorNumber: string;
  firstName: string;
  lastName: string;
  bloodType: BloodType;
  syncStatus: SyncStatus;
}

// Visit with donor info for display
export interface VisitWithDonor extends Visit {
  donor?: {
    firstName: string;
    lastName: string;
    bloodType: BloodType;
    donorNumber: string;
  };
}
