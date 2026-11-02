import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth(['officer', 'admin'], async (req) => {
  const { searchParams } = new URL(req.url);

  let electionId = null;
  const rawElectionId = searchParams.get('electionId');
  if (rawElectionId) {
    electionId = parseInt(rawElectionId, 10);
  } else {
    const elRes = await query(`SELECT election_id FROM election ORDER BY start_date DESC LIMIT 1`);
    if (elRes.rows.length > 0) {
      electionId = elRes.rows[0].election_id;
    }
  }

  let constituencyId = null;
  const rawCId = searchParams.get('constituencyId');
  if (rawCId) {
    constituencyId = parseInt(rawCId, 10);
  }

  const q = searchParams.get('q')?.trim() || null;

  const res = await query(
    `SELECT v.voter_id, v.name, k.name AS constituency, COALESCE(vs.has_voted, false) AS has_voted
     FROM voter v
     JOIN constituency k ON k.constituency_id = v.constituency_id
     LEFT JOIN voter_status vs ON vs.voter_id = v.voter_id AND vs.election_id = $1
     WHERE ($2::int IS NULL OR v.constituency_id = $2)
       AND ($3::text IS NULL OR v.name ILIKE '%' || $3 || '%')
     ORDER BY v.name
     LIMIT 200`,
    [electionId, constituencyId, q]
  );

  return NextResponse.json(res.rows);
});

