import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { partySchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const GET = withAuth(['admin', 'officer', 'voter'], async () => {
  const res = await query(
    `SELECT party_id, name, symbol
     FROM party
     ORDER BY name`
  );
  return NextResponse.json(res.rows);
});

export const POST = withAuth(['admin'], async (req, _ctx, session) => {
  const body = await req.json();
  const data = partySchema.parse(body);

  const res = await query(
    `INSERT INTO party (name, symbol)
     VALUES ($1, $2)
     RETURNING party_id, name, symbol`,
    [data.name.trim(), data.symbol.trim()]
  );

  const party = res.rows[0];
  await logAudit('PARTY_CREATED', session.userId, { partyId: party.party_id, name: party.name }, req);

  return NextResponse.json(party, { status: 201 });
});

