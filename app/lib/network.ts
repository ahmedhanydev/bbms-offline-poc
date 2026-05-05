// app/lib/network.ts
// Network status detection and management for BBMS

import type { NetworkState } from './types';

// Re-export type for convenience
export type { NetworkState };

// Global network state
let networkState: NetworkState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isForcedOffline: false,
  lastOnlineAt: typeof navigator !== 'undefined' && navigator.onLine ? Date.now() : null,
  lastOfflineAt: typeof navigator !== 'undefined' && !navigator.onLine ? Date.now() : null,
};

// Callback registry for state changes
const listeners: Set<(state: NetworkState) => void> = new Set();

// Notify all listeners of state change
function notifyListeners() {
  listeners.forEach(callback => {
    try {
      callback({ ...networkState });
    } catch (error) {
      console.error('[Network] Error in listener callback:', error);
    }
  });
}

// Initialize network listeners (call once in app)
export function initNetworkListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    if (!networkState.isForcedOffline) {
      networkState = {
        ...networkState,
        isOnline: true,
        lastOnlineAt: Date.now(),
      };
      notifyListeners();
      console.log('[Network] Connection restored');
    }
  };

  const handleOffline = () => {
    networkState = {
      ...networkState,
      isOnline: false,
      lastOfflineAt: Date.now(),
    };
    notifyListeners();
    console.log('[Network] Connection lost');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Subscribe to network state changes
export function subscribeToNetwork(callback: (state: NetworkState) => void): () => void {
  listeners.add(callback);
  // Immediately call with current state
  callback({ ...networkState });
  
  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
  };
}

// Get current network state
export function getNetworkState(): NetworkState {
  return { ...networkState };
}

// Check if online (considers forced offline)
export function isOnline(): boolean {
  return networkState.isOnline && !networkState.isForcedOffline;
}

// Force offline mode (for testing)
export function setForcedOffline(forced: boolean): void {
  networkState = {
    ...networkState,
    isForcedOffline: forced,
    isOnline: forced ? false : navigator.onLine,
    lastOfflineAt: forced ? Date.now() : networkState.lastOfflineAt,
  };
  notifyListeners();
  console.log(`[Network] Forced offline mode: ${forced}`);
}

// Toggle forced offline mode
export function toggleForcedOffline(): boolean {
  setForcedOffline(!networkState.isForcedOffline);
  return networkState.isForcedOffline;
}

// Check server connectivity (ping endpoint)
export async function checkServerConnection(serverUrl: string = 'https://api-57357stag.57357.org'): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${serverUrl}/api/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Utility to wait for online status
export function waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);

    const unsubscribe = subscribeToNetwork((state) => {
      if (state.isOnline && !state.isForcedOffline) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(true);
      }
    });
  });
}

// Debounced online check for UI updates
export function debouncedOnlineCheck(callback: (isOnline: boolean) => void, delay: number = 1000): () => void {
  let timeoutId: NodeJS.Timeout;
  
  return subscribeToNetwork((state) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(state.isOnline && !state.isForcedOffline);
    }, delay);
  });
}
