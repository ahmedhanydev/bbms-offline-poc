# BBMS Data Model

## Overview

This document describes the data models used in both the client-side IndexedDB and the server-side SQLite database.

## TypeScript Interfaces

### SyncStatus
```typescript
type SyncStatus = 'local_only' | 'pending' | 'synced' | 'failed' | 'conflict';
```

### BloodType
```typescript
type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
```

### Gender
```typescript
type Gender = 'male' | 'female';
```

---

## Donor Entity

### IndexedDB Schema (Client)

```typescript
interface Donor {
  // Local metadata (IndexedDB only)
  localId: string;           // UUID v4 - Primary key
  remoteId: number | null;   // Server-assigned ID after sync
  syncStatus: SyncStatus;
  createdAt: number;         // Unix timestamp (ms)
  updatedAt: number;         // Unix timestamp (ms)
  version: number;           // Optimistic locking
  
  // Business fields
  donorNumber: string;       // Unique donor identifier
  nationalId: string;        // National ID number
  firstName: string;
  lastName: string;
  dateOfBirth: string;       // ISO date (YYYY-MM-DD)
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
```

### SQLite Schema (Server)

```sql
CREATE TABLE donors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- remoteId
  donor_number TEXT UNIQUE NOT NULL,
  national_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  blood_type TEXT NOT NULL CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  last_donation_date TEXT,
  total_donations INTEGER DEFAULT 0,
  is_eligible INTEGER DEFAULT 1,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  version INTEGER DEFAULT 1
);
```

### IndexedDB Indexes
- `by-remote-id` - For server ID lookups
- `by-sync-status` - For filtering by sync state
- `by-donor-number` - Unique constraint

---

## Visit Entity

### IndexedDB Schema (Client)

```typescript
interface Visit {
  // Local metadata
  localId: string;           // UUID v4 - Primary key
  remoteId: number | null;   // Server-assigned ID after sync
  donorLocalId: string;      // FK to local donor (required)
  donorRemoteId: number | null; // FK to remote donor (after sync)
  syncStatus: SyncStatus;
  createdAt: number;
  updatedAt: number;
  version: number;
  
  // Business fields
  visitNumber: string;       // Unique visit identifier
  visitDate: string;         // ISO date
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
  bloodVolume: number;      // mL (450 for donation, 0 for deferral)
  
  // Status
  status: 'pending' | 'completed' | 'deferred' | 'rejected';
  deferralReason: string | null;
  deferralUntil: string | null;
  
  // Staff
  registeredBy: string;
  screenedBy: string;
  collectedBy: string;
  
  // Notes
  notes: string;
}
```

### SQLite Schema (Server)

```sql
CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_number TEXT UNIQUE NOT NULL,
  visit_date TEXT NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('donation', 'checkup', 'deferral')),
  donor_id INTEGER NOT NULL,  -- FK to donors.id
  weight REAL,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  pulse INTEGER,
  temperature REAL,
  hemoglobin REAL,
  blood_bag_number TEXT,
  blood_volume INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'deferred', 'rejected')),
  deferral_reason TEXT,
  deferral_until TEXT,
  registered_by TEXT,
  screened_by TEXT,
  collected_by TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
);
```

### IndexedDB Indexes
- `by-remote-id` - For server ID lookups
- `by-sync-status` - For filtering by sync state
- `by-donor-local-id` - For donor relationship lookups
- `by-visit-date` - For chronological ordering

---

## SyncQueue Entity

### IndexedDB Schema (Client Only)

```typescript
interface SyncQueueItem {
  id: string;              // Queue item ID (UUID)
  operation: 'CREATE' | 'UPDATE';
  entityType: 'donor' | 'visit';
  localId: string;         // FK to entity being synced
  payload: string;         // JSON stringified entity
  timestamp: number;       // When queued
  retryCount: number;      // Failed attempt count
  lastError: string | null;
  dependencies: string[];    // localIds that must sync first
}
```

### Purpose
- Tracks pending synchronization operations
- Maintains order (timestamp-based)
- Handles dependencies (donor before visit)
- Retry logic with exponential backoff

### IndexedDB Indexes
- `by-timestamp` - For FIFO processing
- `by-entity` - For finding queue items by entity

---

## Relationships

```
┌──────────────┐       ┌──────────────┐
│    Donor     │       │    Visit     │
├──────────────┤       ├──────────────┤
│ localId (PK) │◄──────┤ donorLocalId │
│ remoteId     │       │ localId (PK) │
│ ...          │       │ remoteId     │
└──────────────┘       │ ...          │
                       └──────────────┘
```

### Parent-Child Dependency
- **Visit depends on Donor**
- Cannot sync a visit until its donor has been synced
- `dependencies` array in SyncQueueItem tracks this

---

## Data Validation

### Donor Validation
- `firstName`, `lastName` - Required, non-empty
- `nationalId` - Required, unique
- `donorNumber` - Required, unique, auto-generated
- `bloodType` - Must be valid enum value
- `gender` - Must be valid enum value
- `dateOfBirth` - Valid date format

### Visit Validation
- `visitNumber` - Required, unique, auto-generated
- `visitDate` - Required, valid date
- `donorLocalId` - Required, must exist in donors store
- `status` - Must be valid enum value
- `visitType` - Must be valid enum value

---

## Field Types Mapping

| TypeScript | IndexedDB | SQLite |
|------------|-----------|--------|
| `string`   | `string`  | `TEXT` |
| `number`   | `number`  | `INTEGER` / `REAL` |
| `boolean`  | `boolean` | `INTEGER` (0/1) |
| `Date`     | `number`  | `INTEGER` (timestamp) |
| `enum`     | `string`  | `TEXT` with `CHECK` constraint |
| `UUID`     | `string`  | - (server uses auto-increment) |
