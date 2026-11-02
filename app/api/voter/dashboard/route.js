import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth(['voter'], async (_req, _ctx, session) => {
  const voterRes = await query(
    `SELECT v.voter_id, v.name, v.constituency_id, k.name AS constituency
     FROM voter v
     JOIN constituency k ON k.constituency_id = v.constituency_id
     WHERE v.voter_id = $1`,
    [session.voterId]
  );

  const voter = voterRes.rows[0] || null;

  const electionRes = await query(
    `SELECT election_id, title, start_date, end_date
     FROM election
     WHERE status = 'ONGOING' AND now() BETWEEN start_date AND end_date
     ORDER BY start_date DESC
     LIMIT 1`
  );

  const election = electionRes.rows[0] || null;

  let hasVoted = false;
  if (election && voter) {
    const statusRes = await query(
      `SELECT has_voted
       FROM voter_status
       WHERE voter_id = $1 AND election_id = $2`,
      [session.voterId, election.election_id]
    );
    if (statusRes.rows.length > 0) {
      hasVoted = Boolean(statusRes.rows[0].has_voted);
    }
  }

  return NextResponse.json({
    voter,
    election,
    hasVoted,
  });
});

