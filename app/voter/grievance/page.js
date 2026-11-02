'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

const CATEGORIES = [
  { value: 'polling_booth', label: 'Polling Booth Issues' },
  { value: 'voter_list', label: 'Voter List & Identification' },
  { value: 'candidate_conduct', label: 'Candidate / Campaign Conduct' },
  { value: 'technical', label: 'Technical & Machine Issues' },
  { value: 'other', label: 'General / Other Issues' },
];

export default function VoterGrievancesPage() {
  const [user, setUser] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [category, setCategory] = useState('polling_booth');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
    try {
      const [meData, list] = await Promise.all([
        api('/api/auth/me'),
        api('/api/grievances'),
      ]);
      setUser(meData);
      setGrievances(list || []);
    } catch (err) {
      setError(err.message || 'Failed to load grievances');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (text.length < 10) {
      setError('Grievance text must be at least 10 characters long.');
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api('/api/grievances', {
        method: 'POST',
        body: { category, text },
      });
      setText('');
      setSuccess('Grievance filed successfully with automated vector indexing.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to file grievance');
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'resolved':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">Resolved</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">In Progress</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800">Open</span>;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Electoral Grievances
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Submit complaints directly to election officers with automated semantic tracking
            </p>
          </div>
          <Link href="/voter" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to Dashboard
          </Link>
        </div>

        <Banner type="error" message={error} onClose={() => setError('')} />
        <Banner type="success" message={success} onClose={() => setSuccess('')} />

        <Card title="File a New Grievance">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Detailed Complaint Description
                </label>
                <span className={`text-xs ${text.length > 2000 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                  {text.length} / 2000 characters (min 10)
                </span>
              </div>
              <textarea
                rows={4}
                required
                minLength={10}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe the issue in detail, including booth location, timing, and nature of the complaint..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || text.length < 10 || text.length > 2000}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {submitting ? 'Indexing & Submitting...' : 'Submit Grievance'}
              </button>
            </div>
          </form>
        </Card>

        <Card title="My Filed Grievances">
          {loading ? (
            <Loading text="Loading your filed grievances..." />
          ) : (
            <DataTable
              headers={['Category', 'Description', 'Status', 'Vector Index', 'Filed Date']}
              rows={grievances}
              emptyMessage="You have not submitted any grievances yet."
              renderRow={(g) => (
                <tr key={g._id} className="hover:bg-slate-50/70 border-b border-slate-100">
                  <td className="px-5 py-3.5 font-semibold text-slate-800 text-xs capitalize whitespace-nowrap">
                    {g.category.replace('_', ' ')}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-sm max-w-md break-words">
                    {g.text}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">{getStatusBadge(g.status)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {g.embedded ? (
                      <span className="text-xs text-emerald-600 font-medium">✓ Indexed</span>
                    ) : (
                      <span className="text-xs text-slate-400">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(g.created_at).toLocaleString()}
                  </td>
                </tr>
              )}
            />
          )}
        </Card>
      </main>
    </div>
  );
}

