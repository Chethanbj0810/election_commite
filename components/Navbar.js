'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

export default function Navbar({ user: initialUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(initialUser || null);

  useEffect(() => {
    if (initialUser !== undefined) {
      setCurrentUser(initialUser);
    } else {
      api('/api/auth/me')
        .then((u) => setCurrentUser(u))
        .catch(() => setCurrentUser(null));
    }
  }, [initialUser]);

  const user = initialUser !== undefined ? initialUser : currentUser;
  const role = user?.role;

  async function handleLogout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue to redirect even on error
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white hover:text-indigo-300 transition-colors">
              <span className="p-1.5 bg-indigo-600 rounded-lg text-white">🗳️</span>
              <span>E-Vote Commission</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              {role !== 'voter' && (
                <Link
                  href="/results"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/results' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Live Results
                </Link>
              )}

              {role === 'voter' && (
                <>
                  <Link
                    href="/voter"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/voter' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/voter/vote"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/voter/vote' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Cast Vote
                  </Link>
                  <Link
                    href="/voter/grievance"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/voter/grievance' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Grievances
                  </Link>
                </>
              )}

              {role === 'officer' && (
                <Link
                  href="/officer"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/officer' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Officer Console
                </Link>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    href="/admin"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/admin' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/elections"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/admin/elections' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Elections
                  </Link>
                  <Link
                    href="/admin/candidates"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/admin/candidates' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Candidates & Parties
                  </Link>
                  <Link
                    href="/admin/booths"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/admin/booths' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Booths
                  </Link>
                  <Link
                    href="/admin/analytics"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/admin/analytics' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/admin/audit-logs' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    Audit Logs
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs text-slate-400 font-mono">{user.email}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

