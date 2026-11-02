'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const [user, setUser] = useState(null);
  const [source, setSource] = useState('postgres'); // 'postgres' | 'mongo'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial user load
  useEffect(() => {
    async function init() {
      try {
        const meData = await api('/api/auth/me');
        setUser(meData);
      } catch (err) {
        setError(err.message || 'Failed to authenticate');
      }
    }
    init();
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api(`/api/audit-logs?source=${source}`);
      setLogs(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Audit Trails & Event Logs
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Inspect immutable PostgreSQL system logs and application-level MongoDB security entries
            </p>
          </div>
          <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Dashboard
          </Link>
        </div>

        <Banner type="error" message={error} onClose={() => setError('')} />

        {/* Source Switcher */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setSource('postgres')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              source === 'postgres'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            🐘 PostgreSQL Audit Log (Database Level)
          </button>
          <button
            onClick={() => setSource('mongo')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              source === 'mongo'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            🍃 MongoDB Audit Logs (Application Level)
          </button>
        </div>

        <Card
          title={
            source === 'postgres'
              ? 'PostgreSQL audit_log (Latest 200 records)'
              : 'MongoDB audit_logs Collection (Latest 200 records)'
          }
          subtitle="All operations are strictly audit-logged; vote anonymity is enforced with no candidate links."
        >
          {loading ? (
            <Loading text="Loading log records..." />
          ) : source === 'postgres' ? (
            <DataTable
              headers={['Log ID', 'User Email', 'Action Triggered', 'Details Payload', 'Timestamp']}
              rows={logs}
              emptyMessage="No PostgreSQL audit logs recorded."
              renderRow={(l) => (
                <tr key={l.log_id} className="hover:bg-slate-50/70 border-b border-slate-100 text-xs">
                  <td className="px-5 py-3 font-mono font-medium text-slate-500">#{l.log_id}</td>
                  <td className="px-5 py-3 font-medium text-slate-700">{l.email || 'System'}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                    {l.details ? JSON.stringify(l.details) : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                </tr>
              )}
            />
          ) : (
            <DataTable
              headers={['Entry ID', 'Action', 'IP Address', 'User ID', 'Details Payload', 'Timestamp']}
              rows={logs}
              emptyMessage="No MongoDB audit logs recorded."
              renderRow={(l) => (
                <tr key={l._id} className="hover:bg-slate-50/70 border-b border-slate-100 text-xs">
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-400">
                    {l._id.slice(-8)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-600">{l.ip || 'unknown'}</td>
                  <td className="px-5 py-3 text-slate-700">
                    {l.user_id ? `User #${l.user_id}` : 'Public'}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                    {l.details ? JSON.stringify(l.details) : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString()}
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

