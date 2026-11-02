import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const POST = withAuth(['admin'], async (req, _ctx, session) => {
  const body = await req.json();
  const rawId = body?.electionId;

  if (!rawId) {
    return NextResponse.json({ error: 'electionId is required' }, { status: 400 });
  }

  const electionId = parseInt(rawId, 10);

  // Invoke PostgreSQL stored procedure refresh_results
  await query(`CALL refresh_results($1::int)`, [electionId]);

  const tallyRes = await query(
    `SELECT c.name AS candidate, r.total_votes
     FROM result_summary r
     JOIN candidate c ON c.candidate_id = r.candidate_id
     WHERE r.election_id = $1
     ORDER BY r.total_votes DESC`,
    [electionId]
  );

  await logAudit('RESULTS_REFRESHED', session.userId, { electionId }, req);

  return NextResponse.json(tallyRes.rows);
});

