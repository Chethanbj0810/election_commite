'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'polling_booth', label: 'Polling Booth' },
  { value: 'voter_list', label: 'Voter List' },
  { value: 'candidate_conduct', label: 'Candidate Conduct' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' },
];

export default function OfficerConsolePage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('voters'); // 'voters' | 'grievances' | 'semantic'
  const [constituencies, setConstituencies] = useState([]);

  // Tab 1: Voters State
  const [voters, setVoters] = useState([]);
  const [voterSearch, setVoterSearch] = useState('');
  const [voterConstituency, setVoterConstituency] = useState('');
  const [loadingVoters, setLoadingVoters] = useState(false);

  // Tab 2: Grievances State
  const [grievances, setGrievances] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [constituencyFilter, setConstituencyFilter] = useState('');
  const [loadingGrievances, setLoadingGrievances] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Tab 3: Semantic Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchConstituency, setSearchConstituency] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initial user & constituencies load
  useEffect(() => {
    async function init() {
      try {
        const [meData, constList] = await Promise.all([
          api('/api/auth/me'),
          api('/api/constituencies'),
        ]);
        setUser(meData);
        setConstituencies(constList || []);
      } catch (err) {
        setError(err.message || 'Failed to initialize console');
      }
    }
    init();
  }, []);

  // Fetch voters
  const fetchVoters = useCallback(async () => {
    setLoadingVoters(true);
    try {
      const params = new URLSearchParams();
      if (voterSearch) params.set('q', voterSearch);
      if (voterConstituency) params.set('constituencyId', voterConstituency);

      const data = await api(`/api/voters?${params.toString()}`);
      setVoters(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load voters');
    } finally {
      setLoadingVoters(false);
    }
  }, [voterSearch, voterConstituency]);

  // Fetch grievances
  const fetchGrievances = useCallback(async () => {
    setLoadingGrievances(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (constituencyFilter) params.set('constituencyId', constituencyFilter);

      const data = await api(`/api/grievances?${params.toString()}`);
      setGrievances(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load grievances');
    } finally {
      setLoadingGrievances(false);
    }
  }, [statusFilter, categoryFilter, constituencyFilter]);

  useEffect(() => {
    if (activeTab === 'voters') {
      fetchVoters();
    } else if (activeTab === 'grievances') {
      fetchGrievances();
    }
  }, [activeTab, fetchVoters, fetchGrievances]);

  // Handle status update
  async function handleStatusChange(id, newStatus) {
    setUpdatingId(id);
    setError('');
    setSuccess('');
    try {
      await api(`/api/grievances/${id}`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      setSuccess('Grievance status updated successfully.');
      await fetchGrievances();
    } catch (err) {
      setError(err.message || 'Failed to update grievance status');
    } finally {
      setUpdatingId(null);
    }
  }

  // Handle semantic search
  async function handleSemanticSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setError('');
    setLoadingSearch(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ q: searchQuery.trim() });
      if (searchConstituency) params.set('constituencyId', searchConstituency);

      const results = await api(`/api/search?${params.toString()}`);
      setSearchResults(results || []);
    } catch (err) {
      setError(err.message || 'Semantic search failed');
    } finally {
      setLoadingSearch(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Election Officer Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervise voter turnout, manage citizen complaints, and explore grievance semantics
          </p>
        </div>

        <Banner type="error" message={error} onClose={() => setError('')} />
        <Banner type="success" message={success} onClose={() => setSuccess('')} />

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('voters')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'voters'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            👥 Voters Roster
          </button>
          <button
            onClick={() => setActiveTab('grievances')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'grievances'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📋 Grievances Management
          </button>
          <button
            onClick={() => setActiveTab('semantic')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'semantic'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            🧠 AI Semantic Search
          </button>
        </div>

        {/* TAB 1: VOTERS */}
        {activeTab === 'voters' && (
          <Card title="Electorate Verification Roster">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                placeholder="Search voter by name..."
                value={voterSearch}
                onChange={(e) => setVoterSearch(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={voterConstituency}
                onChange={(e) => setVoterConstituency(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Constituencies</option>
                {constituencies.map((c) => (
                  <option key={c.constituency_id} value={c.constituency_id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchVoters}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-lg cursor-pointer"
              >
                Search
              </button>
            </div>

            {loadingVoters ? (
              <Loading text="Loading electorate records..." />
            ) : (
              <DataTable
                headers={['Voter ID', 'Full Name', 'Constituency', 'Turnout Status']}
                rows={voters}
                emptyMessage="No voters found matching your criteria."
                renderRow={(v) => (
                  <tr key={v.voter_id} className="hover:bg-slate-50/70 border-b border-slate-100">
                    <td className="px-5 py-3.5 text-xs font-mono font-medium text-slate-500">
                      VTR-{String(v.voter_id).padStart(6, '0')}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 text-sm">
                      {v.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{v.constituency}</td>
                    <td className="px-5 py-3.5">
                      {v.has_voted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          ✓ Voted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          ○ Not Voted
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              />
            )}
          </Card>
        )}

        {/* TAB 2: GRIEVANCES */}
        {activeTab === 'grievances' && (
          <Card title="Constituent Grievance Triage">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                value={constituencyFilter}
                onChange={(e) => setConstituencyFilter(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Constituencies</option>
                {constituencies.map((c) => (
                  <option key={c.constituency_id} value={c.constituency_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {loadingGrievances ? (
              <Loading text="Loading grievances data..." />
            ) : (
              <DataTable
                headers={['Category', 'Constituency', 'Complaint Text', 'Current Status', 'Action']}
                rows={grievances}
                emptyMessage="No grievances match the specified filters."
                renderRow={(g) => {
                  const constName =
                    constituencies.find((c) => c.constituency_id === g.constituency_id)?.name ||
                    `ID: ${g.constituency_id}`;
                  return (
                    <tr key={g._id} className="hover:bg-slate-50/70 border-b border-slate-100">
                      <td className="px-5 py-3.5 font-semibold text-slate-800 text-xs capitalize whitespace-nowrap">
                        {g.category.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                        {constName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 text-sm max-w-md break-words">
                        {g.text}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            g.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : g.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {g.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <select
                          value={g.status}
                          disabled={updatingId === g._id}
                          onChange={(e) => handleStatusChange(g._id, e.target.value)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-900 rounded-md border border-slate-300 bg-white hover:border-slate-400 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  );
                }}
              />
            )}
          </Card>
        )}

        {/* TAB 3: SEMANTIC SEARCH */}
        {activeTab === 'semantic' && (
          <Card title="pgvector Semantic Grievance Discovery">
            <p className="text-xs text-slate-500 mb-4">
              Enter any query in natural language (e.g. &quot;broken voting machines&quot; or &quot;long lines at the booth&quot;).
              The system computes a 384-dimensional dense vector and calculates cosine similarity across indexed grievances.
            </p>

            <form onSubmit={handleSemanticSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                required
                placeholder="Search complaint concepts (e.g. booth queue delay, machine malfunction)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={searchConstituency}
                onChange={(e) => setSearchConstituency(e.target.value)}
                className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Constituencies</option>
                {constituencies.map((c) => (
                  <option key={c.constituency_id} value={c.constituency_id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loadingSearch}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm cursor-pointer"
              >
                {loadingSearch ? 'Analyzing Vectors...' : 'Find Matches'}
              </button>
            </form>

            {loadingSearch ? (
              <Loading text="Computing query embedding and searching vector space..." />
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic">
                No matching grievances found in vector space.
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((item, idx) => {
                  const pct = Math.round(item.similarity * 100);
                  return (
                    <div
                      key={item._id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase">
                            Rank #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold uppercase text-slate-500">
                            {item.category?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600">Similarity:</span>
                          <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-800 text-sm leading-relaxed">{item.text}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                        <span>Status: <strong className="capitalize text-slate-600">{item.status}</strong></span>
                        <span>Filed: {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

