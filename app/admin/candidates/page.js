'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import DataTable from '@/components/DataTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import { api } from '@/lib/api';

export default function AdminCandidatesPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('candidates'); // 'parties' | 'candidates'
  const [elections, setElections] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [parties, setParties] = useState([]);
  const [candidates, setCandidates] = useState([]);

  const [selectedElection, setSelectedElection] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Dialogs
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [partyForm, setPartyForm] = useState({ name: '', symbol: '' });

  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    partyId: '',
    constituencyId: '',
    electionId: '',
  });

  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    type: null, // 'party' | 'candidate'
    id: null,
    name: '',
  });

  // Load baseline metadata
  async function init() {
    try {
      const [meData, elList, constList, partyList] = await Promise.all([
        api('/api/auth/me'),
        api('/api/elections'),
        api('/api/constituencies'),
        api('/api/parties'),
      ]);
      setUser(meData);
      setElections(elList || []);
      setConstituencies(constList || []);
      setParties(partyList || []);

      if (elList && elList.length > 0) {
        setSelectedElection(String(elList[0].election_id));
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize candidates & parties');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
  }, []);

  const loadParties = useCallback(async () => {
    try {
      const list = await api('/api/parties');
      setParties(list || []);
    } catch (err) {
      setError(err.message || 'Failed to load parties');
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    if (!selectedElection) return;
    try {
      const params = new URLSearchParams({ electionId: selectedElection });
      if (candidateSearch) params.set('q', candidateSearch);
      const list = await api(`/api/candidates?${params.toString()}`);
      setCandidates(list || []);
    } catch (err) {
      setError(err.message || 'Failed to load candidates');
    }
  }, [selectedElection, candidateSearch]);

  useEffect(() => {
    if (activeTab === 'parties') {
      loadParties();
    } else if (activeTab === 'candidates' && selectedElection) {
      loadCandidates();
    }
  }, [activeTab, selectedElection, loadCandidates, loadParties]);

  // Party handlers
  function openCreateParty() {
    setEditingParty(null);
    setPartyForm({ name: '', symbol: '' });
    setPartyModalOpen(true);
  }

  function openEditParty(p) {
    setEditingParty(p);
    setPartyForm({ name: p.name, symbol: p.symbol });
    setPartyModalOpen(true);
  }

  async function handlePartySubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingParty) {
        await api(`/api/parties/${editingParty.party_id}`, {
          method: 'PUT',
          body: partyForm,
        });
        setSuccess('Party updated successfully');
      } else {
        await api('/api/parties', {
          method: 'POST',
          body: partyForm,
        });
        setSuccess('Party registered successfully');
      }
      setPartyModalOpen(false);
      await loadParties();
    } catch (err) {
      setError(err.message || 'Failed to save party');
    }
  }

  // Candidate handlers
  function openCreateCandidate() {
    setEditingCandidate(null);
    setCandidateForm({
      name: '',
      partyId: parties[0]?.party_id ? String(parties[0].party_id) : '',
      constituencyId: constituencies[0]?.constituency_id ? String(constituencies[0].constituency_id) : '',
      electionId: selectedElection || '',
    });
    setCandidateModalOpen(true);
  }

  function openEditCandidate(c) {
    setEditingCandidate(c);
    setCandidateForm({
      name: c.name,
      partyId: String(c.party_id),
      constituencyId: String(c.constituency_id),
      electionId: String(c.election_id),
    });
    setCandidateModalOpen(true);
  }

  async function handleCandidateSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: candidateForm.name,
        partyId: Number(candidateForm.partyId),
        constituencyId: Number(candidateForm.constituencyId),
        electionId: Number(candidateForm.electionId),
      };

      if (editingCandidate) {
        await api(`/api/candidates/${editingCandidate.candidate_id}`, {
          method: 'PUT',
          body: payload,
        });
        setSuccess('Candidate details updated');
      } else {
        await api('/api/candidates', {
          method: 'POST',
          body: payload,
        });
        setSuccess('Candidate nominated successfully');
      }
      setCandidateModalOpen(false);
      await loadCandidates();
    } catch (err) {
      setError(err.message || 'Failed to save candidate');
    }
  }

  // Confirm delete
  async function handleExecuteDelete() {
    const { type, id } = confirmDelete;
    setConfirmDelete({ open: false, type: null, id: null, name: '' });
    setError('');
    setSuccess('');

    try {
      if (type === 'party') {
        await api(`/api/parties/${id}`, { method: 'DELETE' });
        setSuccess('Party deleted successfully');
        await loadParties();
      } else if (type === 'candidate') {
        await api(`/api/candidates/${id}`, { method: 'DELETE' });
        setSuccess('Candidate deleted successfully');
        await loadCandidates();
      }
    } catch (err) {
      setError(err.message || 'Delete operation failed');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Parties & Candidates
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Maintain recognized political parties and candidate constituency nominations
            </p>
          </div>
          <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Dashboard
          </Link>
        </div>

        <Banner type="error" message={error} onClose={() => setError('')} />
        <Banner type="success" message={success} onClose={() => setSuccess('')} />

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'candidates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            👤 Candidates Nominated
          </button>
          <button
            onClick={() => setActiveTab('parties')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'parties'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            🏛️ Recognized Parties
          </button>
        </div>

        {/* TAB 1: CANDIDATES */}
        {activeTab === 'candidates' && (
          <Card
            title="Nominated Candidates Roster"
            action={
              <button
                onClick={openCreateCandidate}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
              >
                + Nominate Candidate
              </button>
            }
          >
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap">
                  Election:
                </span>
                <select
                  value={selectedElection}
                  onChange={(e) => setSelectedElection(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {elections.map((el) => (
                    <option key={el.election_id} value={el.election_id}>
                      {el.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Full-text candidate search (FTS indexed)..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={loadCandidates}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-lg cursor-pointer"
                >
                  Search
                </button>
              </div>
            </div>

            {loading ? (
              <Loading text="Loading candidate roster..." />
            ) : (
              <DataTable
                headers={['ID', 'Candidate Name', 'Party', 'Symbol', 'Constituency', 'Actions']}
                rows={candidates}
                emptyMessage="No candidates nominated for this election."
                renderRow={(c) => (
                  <tr key={c.candidate_id} className="hover:bg-slate-50/70 border-b border-slate-100">
                    <td className="px-5 py-3.5 text-xs font-mono font-medium text-slate-500">
                      #{c.candidate_id}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">{c.name}</td>
                    <td className="px-5 py-3.5 text-slate-700 text-sm">{c.party}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                        {c.symbol}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{c.constituency}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditCandidate(c)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDelete({
                              open: true,
                              type: 'candidate',
                              id: c.candidate_id,
                              name: c.name,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            )}
          </Card>
        )}

        {/* TAB 2: PARTIES */}
        {activeTab === 'parties' && (
          <Card
            title="Registered Political Parties"
            action={
              <button
                onClick={openCreateParty}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
              >
                + Register Party
              </button>
            }
          >
            {loading ? (
              <Loading text="Loading parties list..." />
            ) : (
              <DataTable
                headers={['ID', 'Party Name', 'Assigned Electoral Symbol', 'Actions']}
                rows={parties}
                emptyMessage="No political parties registered."
                renderRow={(p) => (
                  <tr key={p.party_id} className="hover:bg-slate-50/70 border-b border-slate-100">
                    <td className="px-5 py-3.5 text-xs font-mono font-medium text-slate-500">
                      #{p.party_id}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">{p.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                        {p.symbol}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditParty(p)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDelete({
                              open: true,
                              type: 'party',
                              id: p.party_id,
                              name: p.name,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            )}
          </Card>
        )}
      </main>

      {/* Candidate Modal */}
      {candidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingCandidate ? 'Edit Candidate' : 'Nominate Candidate'}
            </h3>

            <form onSubmit={handleCandidateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Candidate Name
                </label>
                <input
                  type="text"
                  required
                  value={candidateForm.name}
                  onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                  placeholder="e.g. Asha Rao"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Political Party
                </label>
                <select
                  required
                  value={candidateForm.partyId}
                  onChange={(e) => setCandidateForm({ ...candidateForm, partyId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {parties.map((p) => (
                    <option key={p.party_id} value={p.party_id}>
                      {p.name} ({p.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Constituency
                </label>
                <select
                  required
                  value={candidateForm.constituencyId}
                  onChange={(e) =>
                    setCandidateForm({ ...candidateForm, constituencyId: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {constituencies.map((c) => (
                    <option key={c.constituency_id} value={c.constituency_id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Election
                </label>
                <select
                  required
                  value={candidateForm.electionId}
                  onChange={(e) =>
                    setCandidateForm({ ...candidateForm, electionId: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {elections.map((el) => (
                    <option key={el.election_id} value={el.election_id}>
                      {el.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCandidateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Party Modal */}
      {partyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingParty ? 'Edit Political Party' : 'Register Political Party'}
            </h3>

            <form onSubmit={handlePartySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Party Name
                </label>
                <input
                  type="text"
                  required
                  value={partyForm.name}
                  onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
                  placeholder="e.g. Party A"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Electoral Symbol
                </label>
                <input
                  type="text"
                  required
                  value={partyForm.symbol}
                  onChange={(e) => setPartyForm({ ...partyForm, symbol: e.target.value })}
                  placeholder="e.g. Lotus / Elephant / Hand"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPartyModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        title={`Delete ${confirmDelete.type === 'party' ? 'Party' : 'Candidate'}?`}
        message={`Are you sure you want to permanently delete "${confirmDelete.name}"? If there are active votes or dependent references, deletion will be blocked.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        danger={true}
        onConfirm={handleExecuteDelete}
        onCancel={() => setConfirmDelete({ open: false, type: null, id: null, name: '' })}
      />
    </div>
  );
}

