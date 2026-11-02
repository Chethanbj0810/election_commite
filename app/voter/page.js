'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import { api } from '@/lib/api';

export default function VoterDashboardPage() {
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [meData, dashData] = await Promise.all([
          api('/api/auth/me'),
          api('/api/voter/dashboard'),
        ]);
        setUser(meData);
        setData(dashData);
      } catch (err) {
        setError(err.message || 'Failed to load voter dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Voter Portal
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Participate in ongoing elections and manage election grievances securely
            </p>
          </div>
          <Link
            href="/voter/grievance"
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-colors"
          >
            📢 File / View Grievances
          </Link>
        </div>

        <Banner message={error} onClose={() => setError('')} />

        {loading ? (
          <Loading text="Loading voter profile & election status..." />
        ) : !data || !data.voter ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 italic">No voter profile found for this account.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Voter profile card */}
            <Card title="Voter Identity" className="md:col-span-1">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase font-semibold text-slate-400">Full Name</p>
                  <p className="text-lg font-bold text-slate-800">{data.voter.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-slate-400">Voter ID</p>
                  <p className="text-sm font-mono font-medium text-slate-700">
                    VTR-{String(data.voter.voter_id).padStart(6, '0')}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-slate-400">Constituency</p>
                  <span className="inline-block mt-1 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
                    {data.voter.constituency}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ballots are cryptographically decoupled from your identity to ensure 100% vote anonymity.
                  </p>
                </div>
              </div>
            </Card>

            {/* Active Election Card */}
            <Card title="Active Election & Voting Status" className="md:col-span-2">
              {data.election ? (
                <div className="space-y-6">
                  <div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                      Election Ongoing
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 mt-2">{data.election.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Window: {new Date(data.election.start_date).toLocaleString()} &mdash;{' '}
                      {new Date(data.election.end_date).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase font-semibold text-slate-500">Your Voting Status</p>
                      <div className="mt-1 flex items-center gap-2">
                        {data.hasVoted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <span>✓</span> Voted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <span>●</span> Not Yet Voted
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {data.hasVoted ? (
                        <button
                          disabled
                          className="px-5 py-2.5 bg-slate-200 text-slate-400 font-semibold text-sm rounded-lg cursor-not-allowed"
                        >
                          Vote Already Cast
                        </button>
                      ) : (
                        <Link
                          href="/voter/vote"
                          className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
                        >
                          Vote Now →
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
                    <p className="font-semibold mb-1">Notice to Voters:</p>
                    <p>
                      Each voter is authorized to cast a single ballot per election. Once submitted, your vote is irrevocable and protected by database triggers.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <span className="text-4xl">⏳</span>
                  <p className="mt-3 text-base font-semibold text-slate-700">No Ongoing Elections</p>
                  <p className="text-xs text-slate-500 mt-1">
                    There are no active elections open for voting at this time. Please check back later.
                  </p>
                  <button
                    disabled
                    className="mt-5 px-5 py-2.5 bg-slate-200 text-slate-400 font-semibold text-sm rounded-lg cursor-not-allowed"
                  >
                    Voting Disabled
                  </button>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

