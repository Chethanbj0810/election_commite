import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { boothSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const GET = withAuth(['admin', 'officer', 'voter'], async (req, _ctx, session) => {
  const { searchParams } = new URL(req.url);

  let targetConstituencyId = null;
  if (session.role === 'voter') {
    targetConstituencyId = session.constituencyId;
  } else {
    const rawCId = searchParams.get('constituencyId');
    if (rawCId) {
      targetConstituencyId = parseInt(rawCId, 10);
    }
  }

  const res = await query(
    `SELECT booth_id, constituency_id, location, capacity
     FROM polling_booth
     WHERE ($1::int IS NULL OR constituency_id = $1)
     ORDER BY location`,
    [targetConstituencyId]
  );

  return NextResponse.json(res.rows);
});

export const POST = withAuth(['admin'], async (req, _ctx, session) => {
  const body = await req.json();
  const data = boothSchema.parse(body);

  const res = await query(
    `INSERT INTO polling_booth (constituency_id, location, capacity)
     VALUES ($1, $2, $3)
     RETURNING booth_id, constituency_id, location, capacity`,
    [data.constituencyId, data.location, data.capacity]
  );

  const booth = res.rows[0];
  await logAudit('BOOTH_CREATED', session.userId, { boothId: booth.booth_id }, req);

  return NextResponse.json(booth, { status: 201 });
});

