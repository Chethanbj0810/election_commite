import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { getDb } from '@/lib/db-mongo';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth(['admin'], async (req) => {
  const { searchParams } = new URL(req.url);

  let electionId = null;
  const rawId = searchParams.get('electionId');
  if (rawId) {
    electionId = parseInt(rawId, 10);
  } else {
    const elRes = await query(`SELECT election_id FROM election ORDER BY start_date DESC LIMIT 1`);
    if (elRes.rows.length > 0) {
      electionId = elRes.rows[0].election_id;
    }
  }

  const [regRes, totalVotesRes, votedCountRes] = await Promise.all([
    query(`SELECT COUNT(*) AS count FROM voter`),
    electionId
      ? query(`SELECT COUNT(*) AS count FROM vote WHERE election_id = $1`, [electionId])
      : { rows: [{ count: 0 }] },
    electionId
      ? query(
          `SELECT COUNT(*) AS count FROM voter_status WHERE election_id = $1 AND has_voted = true`,
          [electionId]
        )
      : { rows: [{ count: 0 }] },
  ]);

  const registered = regRes.rows[0]?.count ?? 0;
  const totalVotes = totalVotesRes.rows[0]?.count ?? 0;
  const votedCount = votedCountRes.rows[0]?.count ?? 0;

  let openGrievances = 0;
  try {
    const db = getDb();
    openGrievances = await db.collection('grievances').countDocuments({ status: 'open' });
  } catch (err) {
    console.error('Failed to count grievances:', err);
  }

  return NextResponse.json({
    electionId,
    registered,
    totalVotes,
    votedCount,
    openGrievances,
  });
});

