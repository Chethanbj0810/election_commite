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

export default function AdminBoothsPage() {
  const [user, setUser] = useState(null);
  const [constituencies, setConstituencies] = useState([]);
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [booths, setBooths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal & Dialog state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooth, setEditingBooth] = useState(null);
  const [formData, setFormData] = useState({
    constituencyId: '',
    location: '',
    capacity: 500,
  });

  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    id: null,
    location: '',
  });

  // Load constituencies
  async function init() {
    try {
      const [meData, constList] = await Promise.all([
        api('/api/auth/me'),
        api('/api/constituencies'),
      ]);
      setUser(meData);
      setConstituencies(constList || []);
      if (constList && constList.length > 0) {
        setSelectedConstituency(String(constList[0].constituency_id));
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize booths page');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
  }, []);

  const loadBooths = useCallback(async () => {
    try {
      const url = selectedConstituency
        ? `/api/booths?constituencyId=${selectedConstituency}`
        : '/api/booths';
      const list = await api(url);
      setBooths(list || []);
    } catch (err) {
      setError(err.message || 'Failed to load polling booths');
    }
  }, [selectedConstituency]);

  useEffect(() => {
    if (selectedConstituency !== undefined) {
      loadBooths();
    }
  }, [selectedConstituency, loadBooths]);

  function openCreateModal() {
    setEditingBooth(null);
    setFormData({
      constituencyId: selectedConstituency || (constituencies[0]?.constituency_id ? String(constituencies[0].constituency_id) : ''),
      location: '',
      capacity: 500,
    });
    setModalOpen(true);
  }

  function openEditModal(b) {
    setEditingBooth(b);
    setFormData({
      constituencyId: String(b.constituency_id),
      location: b.location,
      capacity: b.capacity,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        constituencyId: Number(formData.constituencyId),
        location: formData.location,
        capacity: Number(formData.capacity),
      };

      if (editingBooth) {
        await api(`/api/booths/${editingBooth.booth_id}`, {
          method: 'PUT',
          body: payload,
        });
        setSuccess('Polling booth updated successfully');
      } else {
        await api('/api/booths', {
          method: 'POST',
          body: payload,
        });
        setSuccess('Polling booth created successfully');
      }
      setModalOpen(false);
      await loadBooths();
    } catch (err) {
      setError(err.message || 'Failed to save booth');
    }
  }

  async function handleDelete() {
    const { id } = confirmDelete;
    setConfirmDelete({ open: false, id: null, location: '' });
    setError('');
    setSuccess('');

    try {
      await api(`/api/booths/${id}`, { method: 'DELETE' });
      setSuccess('Polling booth deleted successfully');
      await loadBooths();
    } catch (err) {
      setError(err.message || 'Failed to delete polling booth');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Polling Booths
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure physical voting centers, location addresses, and voter capacity constraints
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              ← Dashboard
            </Link>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm cursor-pointer"
            >
              + Add Polling Booth
            </button>
          </div>
        </div>

        <Banner type="error" message={error} onClose={() => setError('')} />
        <Banner type="success" message={success} onClose={() => setSuccess('')} />

        <Card
          title="Constituency Polling Booths"
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap">
                Filter Constituency:
              </span>
              <select
                value={selectedConstituency}
                onChange={(e) => setSelectedConstituency(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Constituencies</option>
                {constituencies.map((c) => (
                  <option key={c.constituency_id} value={c.constituency_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {loading ? (
            <Loading text="Loading polling booth registry..." />
          ) : (
            <DataTable
              headers={['ID', 'Location / Facility Name', 'Constituency', 'Voter Capacity', 'Actions']}
              rows={booths}
              emptyMessage="No polling booths registered for this constituency."
              renderRow={(b) => {
                const constName =
                  constituencies.find((c) => c.constituency_id === b.constituency_id)?.name ||
                  `ID ${b.constituency_id}`;
                return (
                  <tr key={b.booth_id} className="hover:bg-slate-50/70 border-b border-slate-100">
                    <td className="px-5 py-3.5 text-xs font-mono font-medium text-slate-500">
                      #{b.booth_id}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">{b.location}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{constName}</td>
                    <td className="px-5 py-3.5 text-slate-700 text-sm font-semibold">
                      {b.capacity.toLocaleString()} voters
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(b)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDelete({
                              open: true,
                              id: b.booth_id,
                              location: b.location,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }}
            />
          )}
        </Card>
      </main>

      {/* Booth Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingBooth ? 'Edit Polling Booth' : 'Add Polling Booth'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Constituency
                </label>
                <select
                  required
                  value={formData.constituencyId}
                  onChange={(e) => setFormData({ ...formData, constituencyId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
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
                  Location / Building Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Govt Primary School, Room 4"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Voter Capacity (Assigned Voters)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Polling Booth
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Delete Polling Booth?"
        message={`Are you sure you want to delete booth "${confirmDelete.location}"? If votes or voters have been recorded at this booth, deletion will be rejected.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, id: null, location: '' })}
      />
    </div>
  );
}

