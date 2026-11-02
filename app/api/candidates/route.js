import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { candidateSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const GET = withAuth(['admin', 'officer', 'voter'], async (req, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const electionIdParam = searchParams.get('electionId');

  if (!electionIdParam) {
    return NextResponse.json({ error: 'electionId parameter is required' }, { status: 400 });
  }

  const electionId = parseInt(electionIdParam, 10);

  let targetConstituencyId = null;
  if (session.role === 'voter') {
    targetConstituencyId = session.constituencyId;
  } else {
    const rawCId = searchParams.get('constituencyId');
    if (rawCId) {
      targetConstituencyId = parseInt(rawCId, 10);
    }
  }

  const q = searchParams.get('q')?.trim() || null;

  const res = await query(
    `SELECT c.candidate_id, c.name, c.election_id, c.constituency_id, c.party_id,
            p.name AS party, p.symbol, k.name AS constituency
     FROM candidate c
     JOIN party p ON p.party_id = c.party_id
     JOIN constituency k ON k.constituency_id = c.constituency_id
     WHERE c.election_id = $1
       AND ($2::int IS NULL OR c.constituency_id = $2)
       AND ($3::text IS NULL OR to_tsvector('simple', c.name) @@ plainto_tsquery('simple', $3)
            OR c.name ILIKE '%' || $3 || '%')
     ORDER BY c.name`,
    [electionId, targetConstituencyId, q]
  );

  return NextResponse.json(res.rows);
});

export const POST = withAuth(['admin'], async (req, _ctx, session) => {
  const body = await req.json();
  const data = candidateSchema.parse(body);

  const res = await query(
    `INSERT INTO candidate (name, party_id, constituency_id, election_id)
     VALUES ($1, $2, $3, $4)
     RETURNING candidate_id, name, party_id, constituency_id, election_id`,
    [data.name.trim(), data.partyId, data.constituencyId, data.electionId]
  );

  const candidate = res.rows[0];
  await logAudit('CANDIDATE_CREATED', session.userId, { candidateId: candidate.candidate_id }, req);

  return NextResponse.json(candidate, { status: 201 });
});

