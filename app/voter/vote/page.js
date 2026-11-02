'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Banner from '@/components/Banner';
import Loading from '@/components/Loading';
import Card from '@/components/Card';
import ConfirmDialog from '@/components/ConfirmDialog';
import { api } from '@/lib/api';

export default function CastVotePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [booths, setBooths] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedBooth, setSelectedBooth] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [meData, dashData] = await Promise.all([
          api('/api/auth/me'),
          api('/api/voter/dashboard'),
        ]);

        setUser(meData);
        setDashboard(dashData);

        if (!dashData.election) {
          setError('There is no ongoing election open for voting.');
          setLoading(false);
          return;
        }

        if (dashData.hasVoted) {
          setError('You have already cast your ballot for this election.');
          setLoading(false);
          return;
        }

        const [candList, boothList] = await Promise.all([
          api(`/api/candidates?electionId=${dashData.election.election_id}`),
          api('/api/booths'),
        ]);

        setCandidates(candList || []);
        setBooths(boothList || []);
        if (boothList && boothList.length > 0) {
          setSelectedBooth(String(boothList[0].booth_id));
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize voting booth');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function handleInitiateVote(e) {
    e.preventDefault();
    if (!selectedCandidate) {
      setError('Please select a candidate to vote for');
      return;
    }
    if (!selectedBooth) {
      setError('Please select a polling booth');
      return;
    }
    setError('');
    setShowConfirm(true);
  }

  async function handleConfirmVote() {
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api('/api/vote', {
        method: 'POST',
        body: {
          electionId: dashboard.election.election_id,
          candidateId: Number(selectedCandidate),
          boothId: Number(selectedBooth),
        },
      });

      setSuccess(res.message || 'Vote cast successfully!');
      setTimeout(() => {
        router.push('/voter');
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Official Electronic Ballot
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select your candidate and polling location to record your vote
            </p>
          </div>
          <Link
            href="/voter"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <Banner type="error" message={error} onClose={() => setError('')} />
        <Banner type="success" message={success} />

        {loading ? (
          <Loading text="Loading official ballot candidates & booths..." />
        ) : !dashboard?.election || dashboard.hasVoted ? (
          <Card className="text-center py-12">
            <p className="text-slate-600 font-medium">Voting is not currently accessible.</p>
            <Link
              href="/voter"
              className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
            >
              Return to Dashboard
            </Link>
          </Card>
        ) : (
          <form onSubmit={handleInitiateVote} className="space-y-6">
            <Card
              title={dashboard.election.title}
              subtitle={`Constituency: ${dashboard.voter.constituency}`}
            >
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Select Polling Booth
                </label>
                {booths.length === 0 ? (
                  <p className="text-sm text-amber-600">No polling booths available for your constituency.</p>
                ) : (
                  <select
                    value={selectedBooth}
                    onChange={(e) => setSelectedBooth(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  >
                    {booths.map((b) => (
                      <option key={b.booth_id} value={b.booth_id}>
                        {b.location} (Capacity: {b.capacity})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  2. Select Candidate
                </label>

                {candidates.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4">
                    No candidates registered for this constituency.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {candidates.map((cand) => {
                      const isSelected = String(selectedCandidate) === String(cand.candidate_id);
                      return (
                        <label
                          key={cand.candidate_id}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <input
                              type="radio"
                              name="candidate"
                              value={cand.candidate_id}
                              checked={isSelected}
                              onChange={() => setSelectedCandidate(cand.candidate_id)}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="font-bold text-slate-900 text-base">{cand.name}</p>
                              <p className="text-xs text-slate-500 font-medium">Party: {cand.party}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                              {cand.symbol}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Your choice is encrypted and anonymous.
                </p>
                <button
                  type="submit"
                  disabled={submitting || !selectedCandidate || !selectedBooth}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  {submitting ? 'Submitting Ballot...' : 'Cast Vote'}
                </button>
              </div>
            </Card>
          </form>
        )}
      </main>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Your Vote"
        message="Are you sure you want to cast this vote? This action cannot be undone, modified, or canceled."
        confirmText="Yes, Cast My Vote"
        cancelText="Review Selection"
        onConfirm={handleConfirmVote}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

