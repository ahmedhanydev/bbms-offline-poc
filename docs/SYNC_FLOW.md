# BBMS Synchronization Flow

## Overview

This document describes the queue-based synchronization system that ensures data consistency between the local IndexedDB and the remote SQLite database.

## Sync Architecture

### Core Principles
1. **Local-First** - All writes go to IndexedDB first
2. **Queue-Based** - Operations queued for async sync
3. **Dependency Ordering** - Parents (donors) sync before children (visits)
4. **Retry with Backoff** - Failed operations retry exponentially
5. **Last-Write-Wins** - Timestamp-based conflict resolution

## Sync Flow Diagram

```
┌─────────────────┐
│   User Action   │
│ (Create/Update) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Save to Local  │────►│  Update UI with │
│   (IndexedDB)   │     │  "local_only"   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Add to Queue   │
│  (syncQueue)    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌────────┐
│Online?│  │Offline?│
└───┬───┘  └───┬────┘
    │          │
    ▼          ▼
┌────────┐  ┌─────────────────┐
│Immediate│  │  Wait for      │
│  Sync   │  │  'online' event │
└───┬────┘  └────────┬────────┘
    │                │
    └────────────────┘
                     │
                     ▼
         ┌─────────────────┐
         │  Process Queue  │
         │  (in order)     │
         └────────┬────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│    Success      │  │     Failure     │
│                 │  │                 │
│ • Update remoteId│  │ • Increment     │
│ • Set synced    │  │   retryCount    │
│ • Remove queue  │  │ • Store error   │
│   item          │  │ • Schedule retry│
└─────────────────┘  │   (backoff)     │
                     └─────────────────┘
```

## Detailed Flow

### 1. Recording an Operation

When a user creates or updates a record:

```typescript
// 1. Generate local UUID
const localId = uuidv4();

// 2. Save to IndexedDB with metadata
const record = {
  ...data,
  localId,
  remoteId: null,
  syncStatus: 'local_only',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
};

// 3. Add to sync queue
const queueItem = {
  id: uuidv4(),
  operation: 'CREATE', // or 'UPDATE'
  entityType: 'donor', // or 'visit'
  localId: record.localId,
  payload: JSON.stringify(record),
  timestamp: Date.now(),
  retryCount: 0,
  lastError: null,
  dependencies: [], // populated for visits
};
```

### 2. Dependency Resolution

For visits, dependencies are checked:

```typescript
// Before queuing a visit
const donor = await getDonor(visit.donorLocalId);
const dependencies = [];

if (donor.syncStatus !== 'synced') {
  // Queue donor first
  const donorQueueItem = await queueDonorSync('CREATE', donor);
  dependencies.push(donorQueueItem.id);
}

// Now queue visit with dependencies
await addToSyncQueue({
  ...visitData,
  dependencies,
});
```

### 3. Queue Processing

The queue is processed in timestamp order, respecting dependencies:

```typescript
async function processQueue() {
  const queue = await getSyncQueue();
  
  // Sort: by timestamp, then resolve dependencies
  const sorted = sortQueueByDependencies(queue);
  
  for (const item of sorted) {
    // Check if dependencies are complete
    const pendingDeps = item.dependencies.filter(
      depId => queue.some(q => q.id === depId)
    );
    
    if (pendingDeps.length > 0) {
      continue; // Skip, dependencies not ready
    }
    
    // Attempt sync
    const result = await syncItem(item);
    
    if (result.success) {
      await removeFromQueue(item.id);
    } else if (result.conflict) {
      await handleConflict(result.conflict);
    } else {
      await handleFailure(item, result.error);
    }
  }
}
```

### 4. Retry Logic

Failed items are retried with exponential backoff:

```typescript
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 2000; // 2 seconds

function calculateBackoffDelay(retryCount) {
  return RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
  // 1st retry: 2s
  // 2nd retry: 4s
  // 3rd retry: 8s
  // 4th retry: 16s
  // 5th retry: 32s
}

async function handleFailure(item, error) {
  const retryCount = item.retryCount + 1;
  
  if (retryCount >= MAX_RETRIES) {
    // Mark as permanently failed
    await updateQueueItem(item.id, {
      retryCount,
      lastError: error,
    });
    
    // Update entity status
    await updateEntityStatus(item.localId, 'failed');
  } else {
    // Schedule retry
    const delay = calculateBackoffDelay(retryCount);
    await updateQueueItem(item.id, {
      retryCount,
      lastError: error,
      timestamp: Date.now() + delay, // Delay next attempt
    });
  }
}
```

### 5. Conflict Resolution

Conflicts detected via version mismatch:

```typescript
// Server detects version mismatch
if (incomingVersion !== serverVersion) {
  return res.status(409).json({
    error: 'Conflict detected',
    serverVersion,
    serverData: currentRecord,
  });
}

// Client resolves using last-write-wins
if (localRecord.updatedAt > serverRecord.updatedAt) {
  // Local is newer - force update
  await forceServerUpdate(localRecord);
} else {
  // Server is newer - accept server version
  await updateLocalRecord(serverRecord);
}
```

## Network Events

### Online Detection

```typescript
// Browser events
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

// On becoming online
function handleOnline() {
  if (!isForcedOffline) {
    // Trigger sync after brief delay
    setTimeout(() => processSyncQueue(), 1000);
  }
}
```

### Background Sync

```javascript
// Service worker
tself.addEventListener('sync', (event) => {
  if (event.tag === 'bbms-sync-queue') {
    event.waitUntil(
      // Notify clients to trigger sync
      notifyClientsToSync()
    );
  }
});
```

## Idempotency

Operations are idempotent through:
- **CREATE with remoteId**: Prevents duplicate creation
- **UPDATE with version**: Prevents lost updates
- **Queue deduplication**: Checks for existing queue items

## Error Handling

### Network Errors
- Temporary: Retry with backoff
- Timeout: Mark for retry
- Server 5xx: Retry with backoff

### Validation Errors
- 400 Bad Request: Log error, don't retry
- 409 Conflict: Trigger conflict resolution
- 404 Not Found: Item deleted on server

### Data Errors
- Invalid JSON: Log and skip
- Missing fields: Log and skip
- Constraint violations: Mark as failed

## Performance Considerations

### Batch Processing
- Current: One item at a time
- Future: Batch multiple items

### Pagination
- List endpoints paginate results
- Default: 50 items per page

### Compression
- Large payloads can be compressed
- Currently: Not implemented

## Monitoring

### Metrics to Track
- Queue length over time
- Sync success/failure rate
- Average sync latency
- Conflict rate
- Retry distribution

### Debug Tools
- DevToolsPanel component
- Console logging
- Queue inspection
- Network status display
