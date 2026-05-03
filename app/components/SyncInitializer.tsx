// app/components/SyncInitializer.tsx
// Initializes sync and network listeners on app startup

'use client';

import { useEffect } from 'react';
import { initNetworkListeners } from '../lib/network';
import { initAutoSync } from '../lib/sync';

export default function SyncInitializer() {
  useEffect(() => {
    // Initialize network listeners
    const cleanupNetwork = initNetworkListeners();
    
    // Initialize auto-sync
    const cleanupAutoSync = initAutoSync();
    
    console.log('[SyncInitializer] Sync and network initialized');
    
    return () => {
      cleanupNetwork();
      cleanupAutoSync();
    };
  }, []);

  return null; // This component doesn't render anything
}
