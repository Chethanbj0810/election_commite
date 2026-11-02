import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { electionSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';
import { handleError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(
      `SELECT election_id, title, start_date, end_date, status
       FROM election
       ORDER BY start_date DESC`
    );
    return NextResponse.json(res.rows);
  } catch (err) {
    return handleError(err);
  }
}

export const POST = withAuth(['admin'], async (req, _ctx, session) => {
  const body = await req.json();
  const data = electionSchema.parse(body);

  const startIso = new Date(data.startDate).toISOString();
  const endIso = new Date(data.endDate).toISOString();

  const res = await query(
    `INSERT INTO election (title, start_date, end_date, status)
     VALUES ($1, $2::timestamptz, $3::timestamptz, $4)
     RETURNING election_id, title, start_date, end_date, status`,
    [data.title.trim(), startIso, endIso, data.status]
  );

  const election = res.rows[0];
  await logAudit('ELECTION_CREATED', session.userId, { electionId: election.election_id }, req);

  return NextResponse.json(election, { status: 201 });
});

