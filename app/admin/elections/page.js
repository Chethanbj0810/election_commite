'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

export default function AdminElectionsPage() {
  const [user, setUser] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingElection, setEditingElection] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    status: 'UPCOMING',
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      const [meData, elList] = await Promise.all([
        api('/api/auth/me'),
        api('/api/elections'),
      ]);
      setUser(meData);
      setElections(elList || []);
    } catch (err) {
      setError(err.message || 'Failed to load elections');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function toLocalDatetime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  function openCreateModal() {
    setEditingElection(null);
    setFormData({
      title: '',
      startDate: '',
      endDate: '',
      status: 'UPCOMING',
    });
    setModalOpen(true);
  }

  function openEditModal(el) {
    setEditingElection(el);
    setFormData({
      title: el.title,
      startDate: toLocalDatetime(el.start_date),
      endDate: toLocalDatetime(el.end_date),
      status: el.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        status: formData.status,
      };

      if (editingElection) {
        await api(`/api/elections/${editingElection.election_id}`, {
          method: 'PUT',
          body: payload,
        });
        setSuccess('Election updated successfully');
      } else {
        await api('/api/elections', {
          method: 'POST',
          body: payload,
        });
        setSuccess('Election created successfully');
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to save election');
    } finally {
      setSubmitting(false);
    }
  }

  async function advanceStatus(el) {
    const nextStatus = el.status === 'UPCOMING' ? 'ONGOING' : el.status === 'ONGOING' ? 'CLOSED' : null;
    if (!nextStatus) return;

    setError('');
    setSuccess('');
    try {
      await api(`/api/elections/${el.election_id}`, {
        method: 'PUT',
        body: {
          title: el.title,
          startDate: el.start_date,
          endDate: el.end_date,
          status: nextStatus,
        },
      });
      setSuccess(`Election ${el.title} advanced to ${nextStatus}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to advance status');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Elections Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure election windows, titles, and forward lifecycle states
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              ← Dashboard
            </Link>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              + Create Election
            </button>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
          💡 <strong>Important Voting Rule:</strong> Voting works only when status is{' '}
          <strong className="underline">ONGOING</strong> and the current time is within the start and end dates.
          Closed elections cannot be modified or re-opened.
        </div>

        <Banner type="error" message={error} onClose={() => setError('')} />
        <Banner type="success" message={success} onClose={() => setSuccess('')} />

        <Card title="Scheduled & Active Elections">
          {loading ? (
            <Loading text="Loading elections..." />
          ) : (
            <DataTable
              headers={['ID', 'Title', 'Start Date', 'End Date', 'Status', 'Actions']}
              rows={elections}
              emptyMessage="No elections created yet."
              renderRow={(el) => (
                <tr key={el.election_id} className="hover:bg-slate-50/70 border-b border-slate-100">
                  <td className="px-5 py-3.5 text-xs font-mono font-medium text-slate-500">
                    #{el.election_id}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-800 text-sm">{el.title}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {new Date(el.start_date).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {new Date(el.end_date).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        el.status === 'ONGOING'
                          ? 'bg-emerald-100 text-emerald-800'
                          : el.status === 'UPCOMING'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {el.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {el.status !== 'CLOSED' && (
                        <>
                          <button
                            onClick={() => openEditModal(el)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => advanceStatus(el)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md cursor-pointer"
                          >
                            Advance ➔
                          </button>
                        </>
                      )}
                      {el.status === 'CLOSED' && (
                        <span className="text-xs text-slate-400 italic">Locked</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            />
          )}
        </Card>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-in fade-in duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingElection ? 'Edit Election' : 'Create New Election'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Election Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="State Assembly General Election 2026"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="ONGOING">ONGOING</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Election'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

