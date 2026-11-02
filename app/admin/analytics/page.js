'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import DataTable from '@/components/DataTable';
import { api } from '@/lib/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export default function AdminAnalyticsPage() {
  const [user, setUser] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');

  // Datasets
  const [liveResults, setLiveResults] = useState(null);
  const [boothTurnout, setBoothTurnout] = useState([]);
  const [winners, setWinners] = useState([]);
  const [grievanceStats, setGrievanceStats] = useState([]);
  const [auditStats, setAuditStats] = useState([]);
  const [officialTally, setOfficialTally] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshingTally, setRefreshingTally] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        setError(err.message || 'Failed to initialize analytics');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch election-specific analytics
  const fetchAnalytics = useCallback(async () => {
    if (!selectedElection) return;
    try {
      const [resData, turnoutData, winnersData, grievData, auditData] = await Promise.all([
        api(`/api/results?electionId=${selectedElection}`),
        api(`/api/analytics/booth-turnout?electionId=${selectedElection}`),
        api(`/api/analytics/winners?electionId=${selectedElection}`),
        api('/api/analytics/grievances'),
        api('/api/analytics/audit-actions'),
      ]);

      setLiveResults(resData);
      setBoothTurnout(turnoutData || []);
      setWinners(winnersData || []);
      setGrievanceStats(grievData || []);
      setAuditStats(auditData || []);
    } catch (err) {
      setError(err.message || 'Failed to load analytics datasets');
    }
  }, [selectedElection]);

  useEffect(() => {
    if (selectedElection) {
      fetchAnalytics();
    }
  }, [selectedElection, fetchAnalytics]);

  // Handle Refresh Official Results (stored procedure CALL refresh_results)
  async function handleRefreshOfficialResults() {
    if (!selectedElection) return;
    setRefreshingTally(true);
    setError('');
    setSuccess('');
    try {
      const tally = await api('/api/analytics/refresh', {
        method: 'POST',
        body: { electionId: Number(selectedElection) },
      });
      setOfficialTally(tally);
      setSuccess('Stored procedure refresh_results executed successfully; official tally updated.');
    } catch (err) {
      setError(err.message || 'Failed to refresh official results');
    } finally {
      setRefreshingTally(false);
    }
  }

  // Grievance summary by category for bar chart
  const grievancesByCategoryMap = {};
  grievanceStats.forEach((g) => {
    const cat = g.category?.replace('_', ' ') || 'other';
    grievancesByCategoryMap[cat] = (grievancesByCategoryMap[cat] || 0) + Number(g.count);
  });
  const grievanceChartData = Object.entries(grievancesByCategoryMap).map(([category, count]) => ({
    category,
    count,
  }));

  // Candidate results chart data
  const candidateChartData = (liveResults?.results || []).map((r) => ({
    label: `${r.candidate} (${r.constituency})`,
    votes: Number(r.votes) || 0,
  }));

  // Booth turnout chart data
  const boothChartData = boothTurnout.map((b) => ({
    location: b.location.length > 20 ? b.location.slice(0, 18) + '...' : b.location,
    fullLocation: b.location,
    turnoutPct: Number(b.turnout_pct) || 0,
    votes: Number(b.votes_cast) || 0,
    capacity: Number(b.capacity) || 0,
  }));

  // Group audit actions per day for line/bar chart
  const auditTimelineMap = {};
  auditStats.forEach((a) => {
    auditTimelineMap[a.day] = (auditTimelineMap[a.day] || 0) + Number(a.count);
  });
  const auditChartData = Object.entries(auditTimelineMap)
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Electoral Intelligence & Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Deep analytics, booth turnouts, constituency margins, and MongoDB grievance aggregations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              ← Dashboard
            </Link>
            <select
              value={selectedElection}
              onChange={(e) => setSelectedElection(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {elections.map((el) => (
                <option key={el.election_id} value={el.election_id}>
                  {el.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Banner type="error" message={error} onClose={() => setError('')} />
        <Banner type="success" message={success} onClose={() => setSuccess('')} />

        {loading ? (
          <Loading text="Loading analytics visualizations..." />
        ) : (
          <div className="space-y-6">
            {/* Section A: Votes Per Candidate */}
            <Card title="A. Candidate Vote Tallies Grouped by Constituency">
              {candidateChartData.length === 0 ? (
                <p className="text-slate-400 text-sm italic text-center py-8">
                  No votes recorded for this election yet.
                </p>
              ) : (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={candidateChartData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        angle={-20}
                        textAnchor="end"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip />
                      <Bar dataKey="votes" name="Votes" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Section B: Booth Turnout % (Highlight < 50% in red) */}
            <Card
              title="B. Polling Booth Turnout Percentages"
              subtitle="Critical Alert: Polling booths with voter turnout under 50% are automatically highlighted in red"
            >
              {boothChartData.length === 0 ? (
                <p className="text-slate-400 text-sm italic text-center py-8">
                  No booth turnout data available for this election.
                </p>
              ) : (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={boothChartData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="location"
                        angle={-20}
                        textAnchor="end"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis
                        unit="%"
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <Tooltip
                        formatter={(val, _name, item) => [
                          `${val}% (${item.payload.votes} / ${item.payload.capacity} voters)`,
                          'Turnout',
                        ]}
                      />
                      <Bar dataKey="turnoutPct" name="Turnout %" radius={[6, 6, 0, 0]}>
                        {boothChartData.map((entry, index) => (
                          <Cell
                            key={`booth-${index}`}
                            fill={entry.turnoutPct < 50 ? '#e11d48' : '#10b981'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Section C: Constituency Winners Table with Margin */}
            <Card title="C. Constituency Winners & Victory Margins (View: v_constituency_winner)">
              <DataTable
                headers={['Constituency', 'Projected Winner', 'Party', 'Votes Won', 'Victory Margin (Lead)']}
                rows={winners}
                emptyMessage="No constituency winners determined yet."
                renderRow={(w, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 border-b border-slate-100">
                    <td className="px-5 py-3.5 font-bold text-slate-800 text-sm">
                      {w.constituency}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-700 text-sm flex items-center gap-2">
                      <span>🏆</span> {w.candidate}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{w.party}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800 text-sm">
                      {Number(w.votes).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-700 text-sm">
                      +{Number(w.margin).toLocaleString()} votes
                    </td>
                  </tr>
                )}
              />
            </Card>

            {/* Section D: Mongo Aggregated Grievances */}
            <Card title="D. Citizen Grievance Analytics (MongoDB Aggregation Pipeline)">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Complaints by Category
                  </h4>
                  {grievanceChartData.length === 0 ? (
                    <p className="text-slate-400 text-xs italic py-10 text-center">
                      No grievance logs stored in MongoDB.
                    </p>
                  ) : (
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={grievanceChartData}
                          margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="category"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            interval={0}
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            name="Complaints"
                            fill="#8b5cf6"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Constituency-Level Grievance Breakdown
                  </h4>
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                    <DataTable
                      headers={['Category', 'Constituency', 'Count']}
                      rows={grievanceStats}
                      emptyMessage="No grievances recorded."
                      renderRow={(g, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 border-b border-slate-100 text-xs">
                          <td className="px-4 py-2 font-semibold capitalize">
                            {g.category.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-2 text-slate-600">{g.constituency_name}</td>
                          <td className="px-4 py-2 font-mono font-bold text-indigo-700">
                            {g.count}
                          </td>
                        </tr>
                      )}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Section E: Audit Actions per Day */}
            <Card title="E. System Activity Frequency (MongoDB Audit Log Aggregation)">
              {auditChartData.length === 0 ? (
                <p className="text-slate-400 text-sm italic text-center py-8">
                  No audit log entries found.
                </p>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={auditChartData}
                      margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Audit Events"
                        stroke="#0ea5e9"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Section F: Official Stored Procedure Refresh */}
            <Card
              title="F. Official Stored Procedure Tally (refresh_results)"
              subtitle="Execute CALL refresh_results(election_id) to calculate official totals in result_summary"
              action={
                <button
                  onClick={handleRefreshOfficialResults}
                  disabled={refreshingTally || !selectedElection}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  {refreshingTally ? 'Executing CALL refresh_results...' : '⚡ Refresh Official Results'}
                </button>
              }
            >
              {officialTally ? (
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500 mb-3">
                    Official PostgreSQL result_summary Tally:
                  </p>
                  <DataTable
                    headers={['Candidate', 'Official Certified Votes']}
                    rows={officialTally}
                    emptyMessage="No candidate tallies generated."
                    renderRow={(row, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 border-b border-slate-100">
                        <td className="px-5 py-3 font-bold text-slate-800 text-sm">
                          {row.candidate}
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-emerald-700 text-sm">
                          {Number(row.total_votes).toLocaleString()} votes
                        </td>
                      </tr>
                    )}
                  />
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  Click &ldquo;Refresh Official Results&rdquo; to execute the database procedure and inspect certified summaries.
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

