import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth(['admin', 'officer'], async (req) => {
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
    return NextResponse.json([]);
  }

  const res = await query(
    `SELECT constituency, candidate, party, votes, margin
     FROM v_constituency_winner
     WHERE election_id = $1
     ORDER BY margin ASC`,
    [electionId]
  );

  return NextResponse.json(res.rows);
});

