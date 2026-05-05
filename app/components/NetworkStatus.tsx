// app/components/NetworkStatus.tsx
// Visual online/offline indicator with force-offline toggle

"use client";

import { useState, useEffect } from "react";
import {
  NetworkState,
  getNetworkState,
  subscribeToNetwork,
  toggleForcedOffline,
} from "../lib/network";

export default function NetworkStatus() {
  const [network, setNetwork] = useState<NetworkState>(getNetworkState());
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToNetwork((state) => {
      setNetwork(state);
    });
    return unsubscribe;
  }, []);

  const handleToggleForcedOffline = () => {
    toggleForcedOffline();
    setShowDropdown(false);
  };

  const isActuallyOnline = network.isOnline && !network.isForcedOffline;

  return (
    <div className="relative ">
      {/* Status Indicator */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          isActuallyOnline
            ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isActuallyOnline ? "bg-green-400 animate-pulse" : "bg-red-400"
          }`}
        />
        <span>
          {isActuallyOnline
            ? "Online"
            : network.isForcedOffline
            ? "Offline (Forced)"
            : "Offline"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${
            showDropdown ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Network Settings
          </h3>

          <div className="space-y-3">
            {/* Actual network status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Browser Status:</span>
              <span
                className={network.isOnline ? "text-green-400" : "text-red-400"}
              >
                {network.isOnline ? "Online" : "Offline"}
              </span>
            </div>

            {/* Force offline toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-slate-300">Force Offline Mode</span>
              <button
                onClick={handleToggleForcedOffline}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  network.isForcedOffline ? "bg-red-500" : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    network.isForcedOffline ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </label>

            {/* Last status change */}
            {network.lastOnlineAt && (
              <div className="text-xs text-slate-500">
                Last online:{" "}
                {new Date(network.lastOnlineAt).toLocaleTimeString()}
              </div>
            )}
            {network.lastOfflineAt && (
              <div className="text-xs text-slate-500">
                Last offline:{" "}
                {new Date(network.lastOfflineAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
