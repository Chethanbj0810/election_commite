'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (res.role === 'admin') {
        router.push('/admin');
      } else if (res.role === 'officer') {
        router.push('/officer');
      } else {
        router.push('/voter');
      }
      router.refresh();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function fillCreds(demoEmail, demoPass) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="text-center mb-6">
              <span className="inline-block p-3 bg-indigo-50 text-2xl rounded-2xl mb-2">🗳️</span>
              <h1 className="text-2xl font-bold text-slate-900">Sign in to E-Vote</h1>
              <p className="text-sm text-slate-500 mt-1">
                Enter your credentials or use a demo account below
              </p>
            </div>

            <Banner message={error} onClose={() => setError('')} />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voter@evote.test"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              New voter?{' '}
              <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
                Register to vote
              </Link>
            </div>

            {/* Demo credentials box */}
            <div className="mt-8 border-t border-slate-100 pt-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Quick Demo Credentials (Click to fill)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillCreds('admin@evote.test', 'Admin@123')}
                  className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer"
                >
                  <p className="font-semibold text-slate-800">Administrator</p>
                  <p className="text-slate-400 font-mono text-[11px]">admin@evote.test</p>
                </button>
                <button
                  type="button"
                  onClick={() => fillCreds('officer@evote.test', 'Officer@123')}
                  className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer"
                >
                  <p className="font-semibold text-slate-800">Election Officer</p>
                  <p className="text-slate-400 font-mono text-[11px]">officer@evote.test</p>
                </button>
                <button
                  type="button"
                  onClick={() => fillCreds('v1@evote.test', 'Voter@123')}
                  className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer"
                >
                  <p className="font-semibold text-slate-800">Voter 1 (Bangalore)</p>
                  <p className="text-slate-400 font-mono text-[11px]">v1@evote.test</p>
                </button>
                <button
                  type="button"
                  onClick={() => fillCreds('v2@evote.test', 'Voter@123')}
                  className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer"
                >
                  <p className="font-semibold text-slate-800">Voter 2 (Bangalore)</p>
                  <p className="text-slate-400 font-mono text-[11px]">v2@evote.test</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

