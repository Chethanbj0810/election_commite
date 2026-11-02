'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import KPI from '@/components/KPI';
import { api } from '@/lib/api';

export default function AdminDashboardPage() {
  const [user, setUser] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial user & elections load
  useEffect(() => {
    async function init() {
      try {
        const [meData, elList] = await Promise.all([
          api('/api/auth/me'),
          api('/api/elections'),
        ]);
        setUser(meData);
        setElections(elList || []);
        if (elList && elList.length > 0) {
          setSelectedElection(String(elList[0].election_id));
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize admin dashboard');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const loadSummary = useCallback(async () => {
    if (!selectedElection) return;
    try {
      const data = await api(`/api/analytics/summary?electionId=${selectedElection}`);
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load election metrics');
    }
  }, [selectedElection]);

  useEffect(() => {
    if (selectedElection) {
      loadSummary();
    }
  }, [selectedElection, loadSummary]);

  const turnoutPct =
    summary && summary.registered > 0
      ? ((summary.totalVotes / summary.registered) * 100).toFixed(1) + '%'
      : '0.0%';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Electoral Commission Oversight
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              High-level administrative monitoring, election governance, and auditing
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
              Election:
            </label>
            <select
              value={selectedElection}
              onChange={(e) => setSelectedElection(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white font-medium shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {elections.map((el) => (
                <option key={el.election_id} value={el.election_id}>
                  {el.title} ({el.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        <Banner type="error" message={error} onClose={() => setError('')} />

        {loading ? (
          <Loading text="Loading administrative dashboard..." />
        ) : (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI
                title="Registered Electorate"
                value={summary?.registered ?? 0}
                subtitle="Enrolled voters statewide"
                icon="👥"
              />
              <KPI
                title="Total Ballots Cast"
                value={summary?.totalVotes ?? 0}
                subtitle="Cast in selected election"
                icon="🗳️"
                highlight={true}
              />
              <KPI
                title="Voter Turnout"
                value={turnoutPct}
                subtitle={`${summary?.votedCount ?? 0} verified voters voted`}
                icon="📊"
              />
              <KPI
                title="Open Grievances"
                value={summary?.openGrievances ?? 0}
                subtitle="Requires officer triage"
                icon="📢"
              />
            </div>

            {/* Quick Links Grid */}
            <Card title="Administrative Management Consoles">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/admin/elections"
                  className="p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all group bg-white"
                >
                  <span className="text-2xl mb-2 inline-block">📅</span>
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Election Calendars
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Schedule election windows, title, dates, and advance election lifecycle status.
                  </p>
                </Link>

                <Link
                  href="/admin/candidates"
                  className="p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all group bg-white"
                >
                  <span className="text-2xl mb-2 inline-block">🏛️</span>
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Parties & Candidates
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage political parties, symbols, candidate nominations, and full-text searches.
                  </p>
                </Link>

                <Link
                  href="/admin/booths"
                  className="p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all group bg-white"
                >
                  <span className="text-2xl mb-2 inline-block">📍</span>
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Polling Booths
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure polling booths per constituency with capacity limits and locations.
                  </p>
                </Link>

                <Link
                  href="/admin/analytics"
                  className="p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all group bg-white"
                >
                  <span className="text-2xl mb-2 inline-block">📈</span>
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Analytics & Winner Tallies
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Constituency winners, booth turnout &lt;50% alerts, Mongo grievance breakdowns.
                  </p>
                </Link>

                <Link
                  href="/admin/audit-logs"
                  className="p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all group bg-white"
                >
                  <span className="text-2xl mb-2 inline-block">🛡️</span>
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Security Audit Trail
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Review immutable PostgreSQL audit logs and MongoDB application events.
                  </p>
                </Link>

                <Link
                  href="/results"
                  className="p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition-all group bg-white"
                >
                  <span className="text-2xl mb-2 inline-block">📺</span>
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Public Live Results
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Public auto-refreshing real-time tally board with constituency vote distributions.
                  </p>
                </Link>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

