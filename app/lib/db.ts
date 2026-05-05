// app/lib/db.ts
// IndexedDB schema and CRUD operations for BBMS

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Donor, Visit, SyncQueueItem, DonorSummary, VisitWithDonor } from './types';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'BBMSDatabase';
const DB_VERSION = 1;

// Database schema definition
interface BBMSDBSchema extends DBSchema {
  donors: {
    key: string; // localId (UUID)
    value: Donor;
    indexes: {
      'by-remote-id': number;
      'by-sync-status': string;
      'by-donor-number': string;
    };
  };
  visits: {
    key: string; // localId (UUID)
    value: Visit;
    indexes: {
      'by-remote-id': number;
      'by-sync-status': string;
      'by-donor-local-id': string;
      'by-visit-date': string;
    };
  };
  syncQueue: {
    key: string; // queue item id
    value: SyncQueueItem;
    indexes: {
      'by-timestamp': number;
      'by-entity': [string, string]; // [entityType, localId]
    };
  };
}

let dbPromise: Promise<IDBPDatabase<BBMSDBSchema>> | null = null;

// Initialize the database
export function initDB(): Promise<IDBPDatabase<BBMSDBSchema>> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<BBMSDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Donors store
      if (!db.objectStoreNames.contains('donors')) {
        const donorStore = db.createObjectStore('donors', { keyPath: 'localId' });
        donorStore.createIndex('by-remote-id', 'remoteId', { unique: false });
        donorStore.createIndex('by-sync-status', 'syncStatus', { unique: false });
        donorStore.createIndex('by-donor-number', 'donorNumber', { unique: true });
      }

      // Visits store
      if (!db.objectStoreNames.contains('visits')) {
        const visitStore = db.createObjectStore('visits', { keyPath: 'localId' });
        visitStore.createIndex('by-remote-id', 'remoteId', { unique: false });
        visitStore.createIndex('by-sync-status', 'syncStatus', { unique: false });
        visitStore.createIndex('by-donor-local-id', 'donorLocalId', { unique: false });
        visitStore.createIndex('by-visit-date', 'visitDate', { unique: false });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        queueStore.createIndex('by-timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('by-entity', ['entityType', 'localId'], { unique: false });
      }
    },
  });

  return dbPromise;
}

// ==================== DONOR OPERATIONS ====================

export async function createDonor(donorData: Omit<Donor, 'localId' | 'remoteId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Donor> {
  const db = await initDB();
  const now = Date.now();
  
  const donor: Donor = {
    ...donorData,
    localId: uuidv4(),
    remoteId: null,
    syncStatus: 'local_only',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await db.put('donors', donor);
  return donor;
}

export async function updateDonor(localId: string, updates: Partial<Donor>): Promise<Donor> {
  const db = await initDB();
  const existing = await db.get('donors', localId);
  
  if (!existing) {
    throw new Error(`Donor with localId ${localId} not found`);
  }

  const updated: Donor = {
    ...existing,
    ...updates,
    localId, // Ensure localId doesn't change
    updatedAt: Date.now(),
    version: existing.version + 1,
    // Respect explicit syncStatus in updates, otherwise auto-bump synced→pending
    syncStatus: updates.syncStatus ?? (existing.syncStatus === 'synced' ? 'pending' : existing.syncStatus),
  };

  await db.put('donors', updated);
  return updated;
}

export async function getDonor(localId: string): Promise<Donor | undefined> {
  const db = await initDB();
  return db.get('donors', localId);
}

export async function getDonorByRemoteId(remoteId: number): Promise<Donor | undefined> {
  const db = await initDB();
  return db.getFromIndex('donors', 'by-remote-id', remoteId);
}

export async function getDonorByDonorNumber(donorNumber: string): Promise<Donor | undefined> {
  const db = await initDB();
  return db.getFromIndex('donors', 'by-donor-number', donorNumber);
}

export async function getAllDonors(): Promise<Donor[]> {
  const db = await initDB();
  return db.getAll('donors');
}

export async function getDonorsBySyncStatus(status: string): Promise<Donor[]> {
  const db = await initDB();
  return db.getAllFromIndex('donors', 'by-sync-status', status);
}

export async function getDonorSummaries(): Promise<DonorSummary[]> {
  const donors = await getAllDonors();
  return donors.map(d => ({
    localId: d.localId,
    remoteId: d.remoteId,
    donorNumber: d.donorNumber,
    firstName: d.firstName,
    lastName: d.lastName,
    bloodType: d.bloodType,
    syncStatus: d.syncStatus,
  }));
}

// Search donors by text across name, donorNumber, city, phone, nationalId, bloodType
export async function searchDonors(query: string): Promise<Donor[]> {
  const db = await initDB();
  const allDonors = await db.getAll('donors');
  const q = query.toLowerCase().trim();
  if (!q) return allDonors;

  return allDonors.filter(d => {
    const searchable = [
      d.firstName,
      d.lastName,
      d.donorNumber,
      d.city,
      d.phone,
      d.nationalId,
      d.bloodType,
      d.address,
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(q);
  });
}

export async function deleteDonor(localId: string): Promise<void> {
  const db = await initDB();
  await db.delete('donors', localId);
}

// ==================== VISIT OPERATIONS ====================

export async function createVisit(visitData: Omit<Visit, 'localId' | 'remoteId' | 'donorRemoteId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Visit> {
  const db = await initDB();
  const now = Date.now();
  
  const visit: Visit = {
    ...visitData,
    localId: uuidv4(),
    remoteId: null,
    donorRemoteId: null,
    syncStatus: 'local_only',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await db.put('visits', visit);
  return visit;
}

export async function updateVisit(localId: string, updates: Partial<Visit>): Promise<Visit> {
  const db = await initDB();
  const existing = await db.get('visits', localId);
  
  if (!existing) {
    throw new Error(`Visit with localId ${localId} not found`);
  }

  const updated: Visit = {
    ...existing,
    ...updates,
    localId,
    updatedAt: Date.now(),
    version: existing.version + 1,
    syncStatus: updates.syncStatus ?? (existing.syncStatus === 'synced' ? 'pending' : existing.syncStatus),
  };

  await db.put('visits', updated);
  return updated;
}

export async function getVisit(localId: string): Promise<Visit | undefined> {
  const db = await initDB();
  return db.get('visits', localId);
}

export async function getAllVisits(): Promise<Visit[]> {
  const db = await initDB();
  return db.getAll('visits');
}

export async function getVisitsByDonor(donorLocalId: string): Promise<Visit[]> {
  const db = await initDB();
  return db.getAllFromIndex('visits', 'by-donor-local-id', donorLocalId);
}

export async function getVisitsBySyncStatus(status: string): Promise<Visit[]> {
  const db = await initDB();
  return db.getAllFromIndex('visits', 'by-sync-status', status);
}

export async function getVisitsWithDonor(): Promise<VisitWithDonor[]> {
  const db = await initDB();
  const visits = await db.getAll('visits');
  
  const visitsWithDonor: VisitWithDonor[] = [];
  
  for (const visit of visits) {
    const donor = await db.get('donors', visit.donorLocalId);
    visitsWithDonor.push({
      ...visit,
      donor: donor ? {
        firstName: donor.firstName,
        lastName: donor.lastName,
        bloodType: donor.bloodType,
        donorNumber: donor.donorNumber,
      } : undefined,
    });
  }
  
  return visitsWithDonor;
}

export async function deleteVisit(localId: string): Promise<void> {
  const db = await initDB();
  await db.delete('visits', localId);
}

// ==================== SYNC QUEUE OPERATIONS ====================

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'lastError'>): Promise<SyncQueueItem> {
  const db = await initDB();
  
  const queueItem: SyncQueueItem = {
    ...item,
    id: uuidv4(),
    timestamp: Date.now(),
    retryCount: 0,
    lastError: null,
  };

  await db.put('syncQueue', queueItem);
  return queueItem;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await initDB();
  const items = await db.getAllFromIndex('syncQueue', 'by-timestamp');
  return items.sort((a, b) => a.timestamp - b.timestamp);
}

export async function getQueueItem(id: string): Promise<SyncQueueItem | undefined> {
  const db = await initDB();
  return db.get('syncQueue', id);
}

export async function updateQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<SyncQueueItem> {
  const db = await initDB();
  const existing = await db.get('syncQueue', id);
  
  if (!existing) {
    throw new Error(`Queue item ${id} not found`);
  }

  const updated = { ...existing, ...updates };
  await db.put('syncQueue', updated);
  return updated;
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('syncQueue', id);
}

export async function clearQueue(): Promise<void> {
  const db = await initDB();
  const items = await db.getAll('syncQueue');
  await Promise.all(items.map(item => db.delete('syncQueue', item.id)));
}

export async function getQueueStats(): Promise<{ total: number; pending: number; failed: number }> {
  const queue = await getSyncQueue();
  return {
    total: queue.length,
    pending: queue.filter(i => i.retryCount === 0 || i.lastError === null).length,
    failed: queue.filter(i => i.lastError !== null).length,
  };
}

// ==================== DATABASE STATS ====================

export async function getDatabaseStats(): Promise<{
  donors: { total: number; synced: number; pending: number; failed: number };
  visits: { total: number; synced: number; pending: number; failed: number };
  queue: { total: number; pending: number; failed: number };
}> {
  const db = await initDB();
  
  const donors = await db.getAll('donors');
  const visits = await db.getAll('visits');
  const queue = await getSyncQueue();

  return {
    donors: {
      total: donors.length,
      synced: donors.filter(d => d.syncStatus === 'synced').length,
      pending: donors.filter(d => d.syncStatus === 'pending' || d.syncStatus === 'local_only').length,
      failed: donors.filter(d => d.syncStatus === 'failed').length,
    },
    visits: {
      total: visits.length,
      synced: visits.filter(v => v.syncStatus === 'synced').length,
      pending: visits.filter(v => v.syncStatus === 'pending' || v.syncStatus === 'local_only').length,
      failed: visits.filter(v => v.syncStatus === 'failed').length,
    },
    queue: {
      total: queue.length,
      pending: queue.filter(i => i.lastError === null).length,
      failed: queue.filter(i => i.lastError !== null).length,
    },
  };
}

// ==================== DEBUG/RESET ====================

export async function clearAllData(): Promise<void> {
  const db = await initDB();
  await Promise.all([
    ...await db.getAll('donors').then(donors => donors.map(d => db.delete('donors', d.localId))),
    ...await db.getAll('visits').then(visits => visits.map(v => db.delete('visits', v.localId))),
    ...await db.getAll('syncQueue').then(items => items.map(i => db.delete('syncQueue', i.id))),
  ]);
}
