import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { candidateSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const PUT = withAuth(['admin'], async (req, { params }, session) => {
  const { id } = await params;
  const candidateId = parseInt(id, 10);
  if (isNaN(candidateId)) {
    return NextResponse.json({ error: 'Invalid candidate ID' }, { status: 400 });
  }

  const body = await req.json();
  const data = candidateSchema.parse(body);

  const res = await query(
    `UPDATE candidate
     SET name = $1, party_id = $2, constituency_id = $3, election_id = $4
     WHERE candidate_id = $5
     RETURNING candidate_id, name, party_id, constituency_id, election_id`,
    [data.name.trim(), data.partyId, data.constituencyId, data.electionId, candidateId]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  const candidate = res.rows[0];
  await logAudit('CANDIDATE_UPDATED', session.userId, { candidateId: candidate.candidate_id }, req);

  return NextResponse.json(candidate);
});

export const DELETE = withAuth(['admin'], async (req, { params }, session) => {
  const { id } = await params;
  const candidateId = parseInt(id, 10);
  if (isNaN(candidateId)) {
    return NextResponse.json({ error: 'Invalid candidate ID' }, { status: 400 });
  }

  const res = await query(
    `DELETE FROM candidate WHERE candidate_id = $1 RETURNING candidate_id, name`,
    [candidateId]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  await logAudit('CANDIDATE_DELETED', session.userId, { candidateId }, req);

  return NextResponse.json({ message: 'Candidate deleted successfully' });
});

