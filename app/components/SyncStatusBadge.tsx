// app/components/SyncStatusBadge.tsx
// Badge showing sync state for records

'use client';

import { SyncStatus } from '../lib/types';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<SyncStatus, { color: string; label: string; icon: string }> = {
  local_only: {
    color: 'bg-slate-500',
    label: 'Local Only',
    icon: '○',
  },
  pending: {
    color: 'bg-yellow-500',
    label: 'Pending',
    icon: '↻',
  },
  synced: {
    color: 'bg-green-500',
    label: 'Synced',
    icon: '✓',
  },
  failed: {
    color: 'bg-red-500',
    label: 'Failed',
    icon: '✕',
  },
  conflict: {
    color: 'bg-orange-500',
    label: 'Conflict',
    icon: '!',
  },
};

export default function SyncStatusBadge({ status, showLabel = true, size = 'md' }: SyncStatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full text-white font-medium ${config.color}/20 text-${config.color.replace('bg-', '')} border border-${config.color.replace('bg-', '')}/30 ${sizeClasses}`}
      title={config.label}
    >
      <span className={config.color.replace('bg-', 'text-')}>
        {config.icon}
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// Alternative: Just the dot version for compact displays
export function SyncStatusDot({ status, size = 'md' }: { status: SyncStatus; size?: 'sm' | 'md' }) {
  const config = statusConfig[status];
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <span
      className={`inline-block rounded-full ${config.color} ${sizeClasses} ${
        status === 'pending' ? 'animate-pulse' : ''
      }`}
      title={config.label}
    />
  );
}
