import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { electionSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const VALID_STATUS_TRANSITIONS = {
  UPCOMING: ['UPCOMING', 'ONGOING', 'CLOSED'],
  ONGOING: ['ONGOING', 'CLOSED'],
  CLOSED: ['CLOSED'],
};

export const PUT = withAuth(['admin'], async (req, { params }, session) => {
  const { id } = await params;
  const electionId = parseInt(id, 10);
  if (isNaN(electionId)) {
    return NextResponse.json({ error: 'Invalid election ID' }, { status: 400 });
  }

  const existingRes = await query(
    `SELECT election_id, status FROM election WHERE election_id = $1`,
    [electionId]
  );
  if (existingRes.rows.length === 0) {
    return NextResponse.json({ error: 'Election not found' }, { status: 404 });
  }

  const currentStatus = existingRes.rows[0].status;
  if (currentStatus === 'CLOSED') {
    return NextResponse.json(
      { error: 'CLOSED elections cannot be edited' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const data = electionSchema.parse(body);

  // Validate forward-only transition
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(data.status)) {
    return NextResponse.json(
      {
        error: `Invalid status transition: cannot move status from ${currentStatus} to ${data.status}`,
      },
      { status: 400 }
    );
  }

  const startIso = new Date(data.startDate).toISOString();
  const endIso = new Date(data.endDate).toISOString();

  const updateRes = await query(
    `UPDATE election
     SET title = $1, start_date = $2::timestamptz, end_date = $3::timestamptz, status = $4
     WHERE election_id = $5
     RETURNING election_id, title, start_date, end_date, status`,
    [data.title.trim(), startIso, endIso, data.status, electionId]
  );

  const updated = updateRes.rows[0];
  await logAudit('ELECTION_UPDATED', session.userId, { electionId, status: data.status }, req);

  return NextResponse.json(updated);
});

