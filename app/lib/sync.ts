// app/lib/sync.ts
// Sync engine and queue manager for BBMS offline-first architecture

import { 
  Donor, 
  Visit, 
  SyncQueueItem, 
  EntityType, 
  OperationType, 
  SyncStats, 
  SyncConflict 
} from './types';
import { 
  initDB, 
  createDonor, 
  updateDonor, 
  getDonor, 
  createVisit, 
  updateVisit, 
  getVisit,
  addToSyncQueue, 
  getSyncQueue, 
  removeFromQueue, 
  updateQueueItem,
  getDatabaseStats 
} from './db';
import { isOnline, checkServerConnection } from './network';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const SERVER_URL = 'https://api-57357stag.57357.org';
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 2000; // 2 seconds base delay

// Callbacks for sync events
interface SyncCallbacks {
  onSyncStart?: () => void;
  onSyncComplete?: (stats: SyncStats) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (conflict: SyncConflict) => void;
}

let callbacks: SyncCallbacks = {};
let isSyncing = false;
let lastSyncAt: number | null = null;

// Set sync event callbacks
export function setSyncCallbacks(cb: SyncCallbacks): void {
  callbacks = { ...callbacks, ...cb };
}

// ==================== FETCH FROM SERVER ====================

// Fetch all donors from server and store in IndexedDB for offline use
export async function fetchDonorsFromServer(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const allDonors: Donor[] = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      const response = await axios.get(`${SERVER_URL}/api/v1/donors?page=${currentPage}`);
      const pageData = response.data.data || response.data;
      const donors = pageData.data || pageData;
      const meta = pageData.current_page !== undefined ? pageData : null;

      if (meta) {
        lastPage = meta.last_page || 1;
      }

      for (const d of donors) {
        // Map snake_case server fields to camelCase Donor type
        const donor: Donor = {
          localId: d.local_id || uuidv4(),
          remoteId: d.id || null,
          donorNumber: d.donor_number || '',
          nationalId: d.national_id || '',
          firstName: d.first_name || '',
          lastName: d.last_name || '',
          dateOfBirth: d.date_of_birth ? d.date_of_birth.split('T')[0] : '',
          gender: d.gender || 'male',
          bloodType: d.blood_type || 'A+',
          phone: d.phone || '',
          email: d.email || '',
          address: d.address || '',
          city: d.city || '',
          emergencyContactName: d.emergency_contact_name || '',
          emergencyContactPhone: d.emergency_contact_phone || '',
          lastDonationDate: d.last_donation_date ? d.last_donation_date.split('T')[0] : null,
          totalDonations: d.total_donations || 0,
          isEligible: d.is_eligible !== undefined ? d.is_eligible : true,
          notes: d.notes || '',
          syncStatus: 'synced',
          version: d.version || 1,
          createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
          updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
        };
        allDonors.push(donor);
      }

      currentPage++;
    } while (currentPage <= lastPage);

    // Store all in IndexedDB
    const db = await initDB();
    const tx = db.transaction('donors', 'readwrite');
    for (const donor of allDonors) {
      tx.store.put(donor);
    }
    await tx.done;

    console.log('[Sync] Fetched', allDonors.length, 'donors from server');
    return { success: true, count: allDonors.length };
  } catch (error) {
    console.error('[Sync] Failed to fetch donors from server:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ==================== QUEUE OPERATIONS ====================

// Queue a donor for sync
export async function queueDonorSync(
  operation: OperationType, 
  donor: Donor
): Promise<SyncQueueItem> {
  const payload = JSON.stringify(donor);
  
  const queueItem = await addToSyncQueue({
    operation,
    entityType: 'donor',
    localId: donor.localId,
    payload,
    dependencies: [], // Donors have no dependencies
  });

  // Trigger immediate sync if online
  if (isOnline()) {
    syncQueueItem(queueItem);
  }

  return queueItem;
}

// Queue a visit for sync
export async function queueVisitSync(
  operation: OperationType,
  visit: Visit
): Promise<SyncQueueItem> {
  // Visits depend on their donor being synced first
  const donor = await getDonor(visit.donorLocalId);
  const dependencies: string[] = [];
  
  if (donor && donor.syncStatus !== 'synced') {
    // Need to sync donor first
    const donorQueueItem = await queueDonorSync(
      donor.syncStatus === 'local_only' ? 'CREATE' : 'UPDATE',
      donor
    );
    dependencies.push(donorQueueItem.id);
  }

  const queueItem = await addToSyncQueue({
    operation,
    entityType: 'visit',
    localId: visit.localId,
    payload: JSON.stringify(visit),
    dependencies,
  });

  // Only sync if online and no dependencies
  if (isOnline() && dependencies.length === 0) {
    syncQueueItem(queueItem);
  }

  return queueItem;
}

// ==================== SYNC PROCESSING ====================

// Process entire sync queue
export async function processSyncQueue(): Promise<SyncStats> {
  if (isSyncing) {
    throw new Error('Sync already in progress');
  }

  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  isSyncing = true;
  callbacks.onSyncStart?.();

  const stats: SyncStats = {
    lastSyncAt: Date.now(),
    queueLength: 0,
    failedCount: 0,
    pendingCount: 0,
    syncedCount: 0,
    conflicts: [],
  };

  try {
    const queue = await getSyncQueue();
    stats.queueLength = queue.length;

    // Sort by timestamp and dependencies
    const sortedQueue = sortQueueByDependencies(queue);

    for (const item of sortedQueue) {
      const result = await syncQueueItem(item);
      
      if (result.success) {
        stats.syncedCount++;
      } else if (result.conflict) {
        stats.conflicts.push(result.conflict);
      } else {
        stats.failedCount++;
      }
    }

    lastSyncAt = Date.now();
    callbacks.onSyncComplete?.(stats);
    return stats;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onSyncError?.(err);
    throw err;
  } finally {
    isSyncing = false;
  }
}

// Sync a single queue item
async function syncQueueItem(item: SyncQueueItem): Promise<{
  success: boolean;
  conflict?: SyncConflict;
}> {
  // Check dependencies
  if (item.dependencies.length > 0) {
    const queue = await getSyncQueue();
    const pendingDeps = item.dependencies.filter(depId => 
      queue.some(q => q.id === depId)
    );
    
    if (pendingDeps.length > 0) {
      // Dependencies not yet synced, skip for now
      return { success: false };
    }
  }

  try {
    let result;
    
    if (item.entityType === 'donor') {
      result = await syncDonor(item);
    } else {
      result = await syncVisit(item);
    }

    if (result.success) {
      await removeFromQueue(item.id);
      return { success: true };
    } else if (result.conflict) {
      callbacks.onConflict?.(result.conflict);
      return { success: false, conflict: result.conflict };
    } else {
      // Retry logic
      await handleSyncFailure(item, 'Sync failed');
      return { success: false };
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await handleSyncFailure(item, errorMsg);
    return { success: false };
  }
}

// Sync donor to server
async function syncDonor(item: SyncQueueItem): Promise<{
  success: boolean;
  conflict?: SyncConflict;
}> {
  const donor: Donor = JSON.parse(item.payload);
  const db = await initDB();

  try {
    const isUpdate = item.operation === 'UPDATE' && donor.remoteId;
    const url = isUpdate 
      ? `${SERVER_URL}/api/v1/donors/${donor.remoteId}`
      : `${SERVER_URL}/api/v1/donors`;
    const method = isUpdate ? 'PUT' : 'POST';

    const response = await axios({
      url,
      method,
      headers: { 'Content-Type': 'application/json' },
      data: donor,
      validateStatus: () => true,
    });

    if (response.status === 409) {
      // Conflict detected
      const serverData = response.data;
      const conflict: SyncConflict = {
        id: uuidv4(),
        entityType: 'donor',
        localId: donor.localId,
        localVersion: donor.version,
        serverVersion: serverData.version,
        localData: donor,
        serverData: serverData as Donor,
        detectedAt: Date.now(),
      };
      return { success: false, conflict };
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const serverResponse = response.data;
    const serverDonor = serverResponse.data || serverResponse;
    
    // Update local record with server data
    // API uses 'id' as remoteId, and response may not have 'version'
    await db.put('donors', {
      ...donor,
      remoteId: serverDonor.id || serverDonor.remoteId,
      syncStatus: 'synced',
      version: serverDonor.version || 1,
    });

    return { success: true };

  } catch (error) {
    console.error('[Sync] syncDonor failed:', error);
    return { success: false };
  }
}

// Sync visit to server
async function syncVisit(item: SyncQueueItem): Promise<{
  success: boolean;
  conflict?: SyncConflict;
}> {
  const visit: Visit = JSON.parse(item.payload);
  const db = await initDB();

  // Get the donor to check remoteId
  const donor = await db.get('donors', visit.donorLocalId);
  if (!donor || !donor.remoteId) {
    return { success: false };
  }

  // Update visit with donor's remoteId
  const visitToSync = {
    ...visit,
    donorRemoteId: donor.remoteId,
  };

  try {
    const isUpdate = item.operation === 'UPDATE' && visit.remoteId;
    const url = isUpdate
      ? `${SERVER_URL}/api/v1/visits/${visit.remoteId}`
      : `${SERVER_URL}/api/v1/visits`;
    const method = isUpdate ? 'PUT' : 'POST';

    const response = await axios({
      url,
      method,
      headers: { 'Content-Type': 'application/json' },
      data: visitToSync,
      validateStatus: () => true,
    });

    if (response.status === 409) {
      const serverData = response.data;
      const conflict: SyncConflict = {
        id: uuidv4(),
        entityType: 'visit',
        localId: visit.localId,
        localVersion: visit.version,
        serverVersion: serverData.version,
        localData: visit,
        serverData: serverData as Visit,
        detectedAt: Date.now(),
      };
      return { success: false, conflict };
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const serverResponse = response.data;
    const serverVisit = serverResponse.data || serverResponse;

    // Update local record
    await db.put('visits', {
      ...visit,
      remoteId: serverVisit.id || serverVisit.remoteId,
      donorRemoteId: donor.remoteId,
      syncStatus: 'synced',
      version: serverVisit.version || 1,
    });

    return { success: true };

  } catch (error) {
    console.error('[Sync] syncVisit failed:', error);
    return { success: false };
  }
}

// Handle sync failure with retry logic
async function handleSyncFailure(item: SyncQueueItem, error: string): Promise<void> {
  const retryCount = item.retryCount + 1;
  
  if (retryCount >= MAX_RETRIES) {
    // Mark as permanently failed
    await updateQueueItem(item.id, {
      retryCount,
      lastError: error,
    });

    // Update entity status
    if (item.entityType === 'donor') {
      const donor = await getDonor(item.localId);
      if (donor) {
        await updateDonor(item.localId, { syncStatus: 'failed' });
      }
    } else {
      const visit = await getVisit(item.localId);
      if (visit) {
        await updateVisit(item.localId, { syncStatus: 'failed' });
      }
    }
  } else {
    // Schedule retry with exponential backoff
    await updateQueueItem(item.id, {
      retryCount,
      lastError: error,
      timestamp: Date.now() + calculateBackoffDelay(retryCount),
    });
  }
}

// Calculate exponential backoff delay
function calculateBackoffDelay(retryCount: number): number {
  // Exponential: 2s, 4s, 8s, 16s, 32s
  return RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
}

// Sort queue respecting dependencies
function sortQueueByDependencies(queue: SyncQueueItem[]): SyncQueueItem[] {
  const itemMap = new Map(queue.map(item => [item.id, item]));
  const visited = new Set<string>();
  const result: SyncQueueItem[] = [];

  function visit(item: SyncQueueItem) {
    if (visited.has(item.id)) return;
    visited.add(item.id);

    // Visit dependencies first
    for (const depId of item.dependencies) {
      const dep = itemMap.get(depId);
      if (dep) visit(dep);
    }

    result.push(item);
  }

  // Sort by timestamp first, then resolve dependencies
  const sortedByTime = [...queue].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const item of sortedByTime) {
    visit(item);
  }

  return result;
}

// ==================== CONFLICT RESOLUTION ====================

// Resolve conflict using last-write-wins
export async function resolveConflict(
  conflict: SyncConflict, 
  preferLocal: boolean
): Promise<void> {
  const db = await initDB();

  if (conflict.entityType === 'donor') {
    if (preferLocal) {
      // Force update to server
      await fetch(`${SERVER_URL}/api/v1/donors/${(conflict.localData as Donor).remoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...conflict.localData,
          version: conflict.serverVersion, // Server version for optimistic locking
        }),
      });
    } else {
      // Accept server version
      await db.put('donors', {
        ...conflict.serverData as Donor,
        localId: conflict.localId,
        syncStatus: 'synced',
      });
    }
  } else {
    if (preferLocal) {
      await fetch(`${SERVER_URL}/api/v1/visits/${(conflict.localData as Visit).remoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...conflict.localData,
          version: conflict.serverVersion,
        }),
      });
    } else {
      await db.put('visits', {
        ...conflict.serverData as Visit,
        localId: conflict.localId,
        syncStatus: 'synced',
      });
    }
  }
}

// ==================== SYNC STATS ====================

export async function getSyncStats(): Promise<SyncStats> {
  const dbStats = await getDatabaseStats();
  const queue = await getSyncQueue();

  return {
    lastSyncAt,
    queueLength: queue.length,
    failedCount: dbStats.queue.failed + dbStats.donors.failed + dbStats.visits.failed,
    pendingCount: dbStats.queue.pending + dbStats.donors.pending + dbStats.visits.pending,
    syncedCount: dbStats.donors.synced + dbStats.visits.synced,
    conflicts: [], // TODO: Track active conflicts
  };
}

export function getLastSyncTime(): number | null {
  return lastSyncAt;
}

export function isSyncInProgress(): boolean {
  return isSyncing;
}

// ==================== AUTO-SYNC ====================

// Trigger sync when coming back online
export function initAutoSync(): () => void {
  const checkAndSync = async () => {
    if (isOnline() && !isSyncing) {
      const queue = await getSyncQueue();
      if (queue.length > 0) {
        try {
          await processSyncQueue();
        } catch (error) {
          console.error('[Sync] Auto-sync failed:', error);
        }
      }
    }
  };

  // Check every 30 seconds when online
  const interval = setInterval(checkAndSync, 30000);

  // Also listen for online events
  const handleOnline = () => {
    setTimeout(checkAndSync, 1000); // Small delay to ensure connection stable
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
  }

  return () => {
    clearInterval(interval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
    }
  };
}
