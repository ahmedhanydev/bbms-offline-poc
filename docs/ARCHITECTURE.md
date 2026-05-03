# BBMS Offline-First Architecture

## System Overview

The BBMS (Blood Bank Management System) Offline-First Prototype demonstrates a proof-of-concept for an offline-capable web application that can function without internet connectivity while seamlessly synchronizing data when connectivity is restored.

## Architecture Components

### 1. Frontend (Next.js 16 + React 19)

**Location:** `/app`

The frontend is built as a Progressive Web App (PWA) using:
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS 4** - Utility-first styling
- **TypeScript** - Type safety

#### Key Frontend Modules:
- **IndexedDB Layer** (`app/lib/db.ts`) - Local data persistence
- **Sync Engine** (`app/lib/sync.ts`) - Queue-based synchronization
- **Network Detection** (`app/lib/network.ts`) - Online/offline state management
- **Type Definitions** (`app/lib/types.ts`) - TypeScript interfaces

### 2. Backend (Express.js + SQLite)

**Location:** `/server`

The backend provides REST API endpoints for data synchronization:
- **Express.js** - Web framework
- **SQLite** - Lightweight file-based database
- **CORS** - Cross-origin request handling

#### API Endpoints:
- `GET /api/health` - Health check
- `GET /api/donors` - List donors
- `POST /api/donors` - Create donor
- `PUT /api/donors/:id` - Update donor
- `GET /api/visits` - List visits
- `POST /api/visits` - Create visit
- `PUT /api/visits/:id` - Update visit

### 3. Service Worker

**Location:** `/public/sw.js`

The service worker enables:
- App shell caching for offline page loading
- Stale-while-revalidate for API calls
- Background sync triggers
- Network-first with cache fallback

### 4. Local Storage (IndexedDB)

Uses the `idb` library for IndexedDB operations with three object stores:
- **donors** - Donor records with sync metadata
- **visits** - Visit records with donor relationships
- **syncQueue** - Pending synchronization operations

## Component Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Next.js   │  │  IndexedDB   │  │ Service Worker  │   │
│  │   React     │◄─┤   (idb)      │◄─┤   (sw.js)       │   │
│  └──────┬──────┘  └──────────────┘  └─────────────────┘   │
└─────────┼───────────────────────────────────────────────────┘
          │
          │ HTTP Requests (when online)
          ▼
┌─────────────────────────────────────┐
│         EXPRESS SERVER              │
│  ┌──────────────┐  ┌────────────┐   │
│  │   Routes     │  │  SQLite    │   │
│  │ (donors.js)  │──┤   (bbms.db)│   │
│  │ (visits.js)  │  │            │   │
│  └──────────────┘  └────────────┘   │
└─────────────────────────────────────┘
```

## Data Flow

### Create Record (Online)
1. User submits form
2. Data saved to IndexedDB with `syncStatus: 'local_only'`
3. Added to sync queue
4. Sync engine attempts immediate sync
5. On success: updated with `remoteId` and `syncStatus: 'synced'`

### Create Record (Offline)
1. User submits form
2. Data saved to IndexedDB with `syncStatus: 'local_only'`
3. Added to sync queue
4. Network detection triggers sync when online
5. Queue processed in dependency order

### Sync Process
1. Service worker detects online status change
2. Triggers sync via message to client
3. Sync engine retrieves queue from IndexedDB
4. Sorts by timestamp and dependencies
5. Processes items: donors before visits
6. Updates local records with server responses
7. Removes successfully synced items from queue

## Key Technical Decisions

### Why IndexedDB?
- Large storage capacity (50MB+)
- Structured data storage
- Indexed queries
- Transaction support
- Works in all modern browsers

### Why SQLite for Backend?
- Zero configuration
- File-based (no separate DB server)
- ACID compliant
- Perfect for prototyping
- Easy to migrate to PostgreSQL later

### Queue-Based Sync vs CRDT
- **Chosen:** Queue-based with timestamps
- **Reason:** Simpler for this use case
- **Trade-off:** Requires conflict resolution

### Last-Write-Wins Conflict Resolution
- Compare `updatedAt` timestamps
- Higher timestamp wins
- Server version tracking prevents lost updates

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari iOS 14+

## Security Considerations

This prototype demonstrates functionality only:
- No authentication implemented
- No HTTPS enforcement
- No data encryption
- Input validation minimal

**Production requirements:**
- OAuth 2.0 / JWT authentication
- HTTPS everywhere
- Input sanitization
- Rate limiting
- Audit logging
