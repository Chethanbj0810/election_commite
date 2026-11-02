import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { handleError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    let electionId = null;
    const rawId = searchParams.get('electionId');
    if (rawId) {
      electionId = parseInt(rawId, 10);
    } else {
      const elRes = await query(`SELECT election_id FROM election ORDER BY start_date DESC LIMIT 1`);
      if (elRes.rows.length > 0) {
        electionId = elRes.rows[0].election_id;
      }
    }

    if (!electionId) {
      return NextResponse.json({
        electionId: null,
        election: null,
        results: [],
        totalVotes: 0,
      });
    }

    const [electionRes, resultsRes, totalVotesRes] = await Promise.all([
      query(
        `SELECT election_id, title, start_date, end_date, status
         FROM election
         WHERE election_id = $1`,
        [electionId]
      ),
      query(
        `SELECT constituency, candidate_id, candidate, party, votes
         FROM v_live_results
         WHERE election_id = $1
         ORDER BY constituency, votes DESC`,
        [electionId]
      ),
      query(
        `SELECT COUNT(*) AS total_votes
         FROM vote
         WHERE election_id = $1`,
        [electionId]
      ),
    ]);

    const election = electionRes.rows[0] || null;
    const results = resultsRes.rows;
    const totalVotes = totalVotesRes.rows[0]?.total_votes ?? 0;

    return NextResponse.json({
      electionId,
      election,
      results,
      totalVotes,
    });
  } catch (err) {
    return handleError(err);
  }
}

