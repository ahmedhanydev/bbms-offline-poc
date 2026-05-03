// app/components/Navigation.tsx
// Main navigation bar for the BBMS app

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NetworkStatus from './NetworkStatus';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/donors', label: 'Donors', icon: '👤' },
  { href: '/visits', label: 'Visits', icon: '📋' },
  { href: '/sync', label: 'Sync', icon: '↻' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🩸</span>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              BBMS
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Network Status */}
          <div className="hidden sm:block">
            <NetworkStatus />
          </div>
        </div>
      </div>
    </nav>
  );
}
