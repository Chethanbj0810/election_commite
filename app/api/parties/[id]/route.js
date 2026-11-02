import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { partySchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const PUT = withAuth(['admin'], async (req, { params }, session) => {
  const { id } = await params;
  const partyId = parseInt(id, 10);
  if (isNaN(partyId)) {
    return NextResponse.json({ error: 'Invalid party ID' }, { status: 400 });
  }

  const body = await req.json();
  const data = partySchema.parse(body);

  const res = await query(
    `UPDATE party
     SET name = $1, symbol = $2
     WHERE party_id = $3
     RETURNING party_id, name, symbol`,
    [data.name.trim(), data.symbol.trim(), partyId]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: 'Party not found' }, { status: 404 });
  }

  const party = res.rows[0];
  await logAudit('PARTY_UPDATED', session.userId, { partyId, name: party.name }, req);

  return NextResponse.json(party);
});

export const DELETE = withAuth(['admin'], async (req, { params }, session) => {
  const { id } = await params;
  const partyId = parseInt(id, 10);
  if (isNaN(partyId)) {
    return NextResponse.json({ error: 'Invalid party ID' }, { status: 400 });
  }

  const res = await query(`DELETE FROM party WHERE party_id = $1 RETURNING party_id, name`, [
    partyId,
  ]);

  if (res.rows.length === 0) {
    return NextResponse.json({ error: 'Party not found' }, { status: 404 });
  }

  await logAudit('PARTY_DELETED', session.userId, { partyId }, req);

  return NextResponse.json({ message: 'Party deleted successfully' });
});

