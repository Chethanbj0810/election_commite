import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { voteSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const POST = withAuth(['voter'], async (req, _ctx, session) => {
  const body = await req.json();
  const { electionId, candidateId, boothId } = voteSchema.parse(body);

  const res = await query(
    `SELECT cast_vote($1::int, $2::int, $3::int, $4::int) AS result`,
    [session.voterId, electionId, candidateId, boothId]
  );

  const result = res.rows[0]?.result;

  if (result === 'OK') {
    // Write Mongo audit entry with ONLY voterId and electionId (NEVER candidate)
    await logAudit(
      'VOTE_CAST',
      session.userId,
      { voterId: session.voterId, electionId },
      req
    );

    return NextResponse.json({ message: 'Vote cast successfully' });
  }

  if (result && result.startsWith('REJECTED')) {
    const errorMsg = result.replace('REJECTED: ', '').trim();
    return NextResponse.json({ error: errorMsg }, { status: 409 });
  }

  return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
});

