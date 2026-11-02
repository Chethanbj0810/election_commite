import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { boothSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const PUT = withAuth(['admin'], async (req, { params }, session) => {
  const { id } = await params;
  const boothId = parseInt(id, 10);
  if (isNaN(boothId)) {
    return NextResponse.json({ error: 'Invalid booth ID' }, { status: 400 });
  }

  const body = await req.json();
  const data = boothSchema.parse(body);

  const res = await query(
    `UPDATE polling_booth
     SET constituency_id = $1, location = $2, capacity = $3
     WHERE booth_id = $4
     RETURNING booth_id, constituency_id, location, capacity`,
    [data.constituencyId, data.location.trim(), data.capacity, boothId]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: 'Booth not found' }, { status: 404 });
  }

  const booth = res.rows[0];
  await logAudit('BOOTH_UPDATED', session.userId, { boothId }, req);

  return NextResponse.json(booth);
});

export const DELETE = withAuth(['admin'], async (req, { params }, session) => {
  const { id } = await params;
  const boothId = parseInt(id, 10);
  if (isNaN(boothId)) {
    return NextResponse.json({ error: 'Invalid booth ID' }, { status: 400 });
  }

  const res = await query(
    `DELETE FROM polling_booth WHERE booth_id = $1 RETURNING booth_id, location`,
    [boothId]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: 'Booth not found' }, { status: 404 });
  }

  await logAudit('BOOTH_DELETED', session.userId, { boothId }, req);

  return NextResponse.json({ message: 'Booth deleted successfully' });
});

