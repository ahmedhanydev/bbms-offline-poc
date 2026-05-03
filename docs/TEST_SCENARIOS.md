# BBMS Test Scenarios

## Overview

This document outlines 8 test scenarios for validating the offline-first functionality of the BBMS prototype.

## Test Environment Setup

```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run dev

# Access URLs
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

---

## Scenario 1: Create Donor Offline

**Objective:** Verify donor creation works while offline and data persists

### Steps
1. Open DevTools → Network tab
2. Enable "Offline" mode in NetworkStatus component
3. Navigate to Donors → New Donor
4. Fill form and submit
5. Navigate to Donors list
6. Verify donor appears with "Local Only" badge
7. Check DevToolsPanel → Queue shows donor CREATE operation
8. Disable offline mode
9. Verify auto-sync triggers
10. Verify donor shows "Synced" badge

### Expected Results
- [x] Donor saved to IndexedDB
- [x] Sync queue entry created
- [x] Status shows "Local Only" initially
- [x] Auto-syncs when online
- [x] Server receives POST /api/donors
- [x] remoteId assigned after sync

---

## Scenario 2: Create Visit Offline with Donor Linking

**Objective:** Verify visit-donor relationship works offline

### Steps
1. Create donor offline (don't sync yet)
2. Navigate to Visits → New Visit
3. Select the offline donor from dropdown
4. Fill visit form and submit
5. Check Donors page - donor shows "Pending"
6. Check Visits page - visit shows "Pending"
7. Check Sync page - queue has 2 items
8. Enable online mode
9. Verify sync order: Donor before Visit

### Expected Results
- [x] Visit saved with donorLocalId reference
- [x] Queue item has dependency on donor
- [x] Donor syncs first
- [x] Visit uses donor's remoteId
- [x] Both marked "Synced"

---

## Scenario 3: Refresh While Offline

**Objective:** Verify data persistence after page refresh

### Steps
1. Create donor offline
2. Note the donor count on dashboard
3. Enable browser offline mode (DevTools)
4. Refresh the page
5. Wait for app to load from cache
6. Check Donors list
7. Check DevToolsPanel → Stats

### Expected Results
- [x] App loads without errors
- [x] Donor data still present
- [x] Sync queue intact
- [x] Service worker serves cached assets

---

## Scenario 4: Restore Connection Auto-Sync

**Objective:** Verify automatic sync when connection restored

### Steps
1. Create 3 donors offline
2. Verify queue has 3 items
3. Disable offline mode
4. Wait 2 seconds
5. Check Sync page
6. Verify all donors show "Synced"
7. Check server database (bbms.db)

### Expected Results
- [x] Auto-sync triggers within 2 seconds
- [x] All items process successfully
- [x] Queue clears
- [x] Server has 3 donor records

---

## Scenario 5: Simulate Server Error & Retry

**Objective:** Verify retry logic with exponential backoff

### Steps
1. Stop the backend server (Ctrl+C)
2. Create donor in frontend
3. Enable online mode (browser thinks it's online)
4. Check DevToolsPanel → Queue
5. Wait for retry attempts
6. Check retry count increases
7. Start backend server
8. Verify eventual sync success

### Expected Results
- [x] Initial sync fails with connection error
- [x] Retry count increments
- [x] Retry delays increase exponentially
- [x] Eventually succeeds when server available

---

## Scenario 6: Conflict Resolution

**Objective:** Verify last-write-wins conflict handling

### Steps
1. Create donor online (synced)
2. Note the remoteId
3. Go offline
4. Edit donor locally (change phone)
5. Directly edit database (simulate other user):
   ```bash
   sqlite3 server/bbms.db "UPDATE donors SET phone='999', version=2 WHERE id=1;"
   ```
6. Go online
7. Trigger sync
8. Check conflict resolution

### Expected Results
- [x] Conflict detected (409 response)
- [x] Last-write-wins applies
- [x] Higher timestamp version wins
- [x] Both records updated consistently

---

## Scenario 7: Donor-Visit Dependency Sync

**Objective:** Verify parent-child dependency ordering

### Steps
1. Go offline
2. Create donor
3. Create visit for that donor
4. Create another donor
5. Create visit for second donor
6. Check Sync page queue order
7. Enable online
8. Monitor sync sequence

### Expected Results
- [x] Donor 1 syncs first
- [x] Visit 1 syncs (uses donor1 remoteId)
- [x] Donor 2 syncs
- [x] Visit 2 syncs
- [x] No orphan visits

---

## Scenario 8: Idempotency Check

**Objective:** Verify no duplicates on retry

### Steps
1. Create donor offline
2. Enable online
3. Sync starts
4. Quickly disable online (mid-sync)
5. Re-enable online
6. Check server database
7. Verify only 1 donor record

### Expected Results
- [x] Only single record created
- [x] No duplicates on retry
- [x] Idempotency maintained via remoteId check

---

## DevTools Testing Features

### DevToolsPanel Capabilities
- Real-time database stats
- Sync queue inspection
- Manual sync trigger
- Data clearing for reset
- Activity logging

### Network Controls
- Force offline toggle in NetworkStatus
- DevTools Network tab offline mode
- Throttling simulation

### Database Inspection
```bash
# View all donors
sqlite3 server/bbms.db "SELECT * FROM donors;"

# View all visits with donor info
sqlite3 server/bbms.db "SELECT v.*, d.first_name, d.last_name FROM visits v JOIN donors d ON v.donor_id = d.id;"

# Clear database
rm server/bbms.db
```

### Browser DevTools
- **Application → IndexedDB** - Inspect local data
- **Application → Service Workers** - Check SW status
- **Network** - Monitor API calls
- **Console** - View sync logs

---

## Regression Testing Checklist

Before marking feature complete:

- [ ] Create donor online → syncs immediately
- [ ] Create donor offline → syncs when online
- [ ] Create visit → donor dropdown populated
- [ ] Edit donor → version increments
- [ ] Delete data → clears all stores
- [ ] Rapid sync clicks → no duplicate requests
- [ ] Offline refresh → data persists
- [ ] Service worker update → skip waiting works
- [ ] Mobile viewport → responsive layout
- [ ] Form validation → shows errors

---

## Performance Benchmarks

### Expected Metrics
- Initial load: < 3s
- IndexedDB query: < 100ms
- Sync operation: < 500ms
- Queue processing: < 100ms/item

### Load Testing
```bash
# Create 100 donors quickly
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/donors \
    -H "Content-Type: application/json" \
    -d "{\"donorNumber\":\"DON-$i\",\"nationalId\":\"NID-$i\",\"firstName\":\"Test\",\"lastName\":\"User$i\",\"dateOfBirth\":\"1990-01-01\",\"gender\":\"male\",\"bloodType\":\"A+\",\"phone\":\"123\",\"address\":\"Test\",\"city\":\"Test\"}"
done
```
