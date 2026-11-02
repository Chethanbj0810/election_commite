'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import DataTable from '@/components/DataTable';
import KPI from '@/components/KPI';
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
} from 'recharts';

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function PublicResultsPage() {
  const [user, setUser] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const intervalRef = useRef(null);

  // Initialize user (if logged in) & elections
  useEffect(() => {
    async function init() {
      try {
        const [meData, elList] = await Promise.all([
          api('/api/auth/me').catch(() => null),
          api('/api/elections'),
        ]);
        if (meData) setUser(meData);
        setElections(elList || []);
        if (elList && elList.length > 0) {
          setSelectedElection(String(elList[0].election_id));
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize live election results');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const fetchResults = useCallback(async (silently = false) => {
    if (!selectedElection) return;
    if (!silently) setLoading(true);
    try {
      const data = await api(`/api/results?electionId=${selectedElection}`);
      setResultsData(data);
      setLastRefreshed(new Date());
    } catch (err) {
      if (!silently) setError(err.message || 'Failed to load live results');
    } finally {
      if (!silently) setLoading(false);
    }
  }, [selectedElection]);

  // Handle selected election switch
  useEffect(() => {
    if (selectedElection) {
      fetchResults(false);
    }
  }, [selectedElection, fetchResults]);

  // 10-second auto refresh interval
  useEffect(() => {
    if (!selectedElection) return;

    intervalRef.current = setInterval(() => {
      fetchResults(true);
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedElection, fetchResults]);

  // Aggregate candidate results for the chart
  const candidateChartData = (resultsData?.results || []).map((r) => ({
    label: `${r.candidate} (${r.constituency})`,
    candidate: r.candidate,
    constituency: r.constituency,
    party: r.party,
    votes: Number(r.votes) || 0,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Live Election Returns
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time cryptographic tally feed &bull; Auto-refreshes every 10 seconds &bull; Last updated:{' '}
              {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap">
              Election:
            </label>
            <select
              value={selectedElection}
              onChange={(e) => setSelectedElection(e.target.value)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white font-medium shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500"
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
          <Loading text="Connecting to live tally feed..." />
        ) : !resultsData || !resultsData.election ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 italic">No election data currently published.</p>
          </Card>
        ) : (
          <>
            {/* Quick KPI stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KPI
                title="Election Status"
                value={resultsData.election.status}
                subtitle={`Window: ${new Date(resultsData.election.start_date).toLocaleDateString()} - ${new Date(resultsData.election.end_date).toLocaleDateString()}`}
                icon="🏛️"
              />
              <KPI
                title="Total Ballots Cast"
                value={resultsData.totalVotes}
                subtitle="Cumulative verified ballots"
                icon="🗳️"
                highlight={true}
              />
              <KPI
                title="Live Contestants"
                value={resultsData.results.length}
                subtitle="Contesting candidates across constituencies"
                icon="👥"
              />
            </div>

            {/* Live Chart */}
            <Card title="Live Vote Distribution by Candidate & Constituency">
              {candidateChartData.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">
                  No votes recorded yet for this election.
                </div>
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
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="votes" name="Votes" radius={[6, 6, 0, 0]}>
                        {candidateChartData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Results Table */}
            <Card title="Constituency Live Tally Table">
              <DataTable
                headers={['Constituency', 'Candidate Name', 'Political Party', 'Votes Received', 'Percentage']}
                rows={resultsData.results}
                emptyMessage="No votes recorded yet."
                renderRow={(row, idx) => {
                  const total = resultsData.totalVotes > 0 ? resultsData.totalVotes : 1;
                  const pct = ((Number(row.votes) / total) * 100).toFixed(1);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 border-b border-slate-100">
                      <td className="px-5 py-3.5 font-bold text-slate-800 text-sm">
                        {row.constituency}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 text-sm">
                        {row.candidate}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-sm">{row.party}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-700 text-sm">
                        {Number(row.votes).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <span>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

