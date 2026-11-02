import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { getDb } from '@/lib/db-mongo';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth(['admin'], async (req) => {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source') || 'postgres';

  if (source === 'mongo') {
    const db = getDb();
    const logs = await db
      .collection('audit_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(200)
      .toArray();

    const formatted = logs.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
    }));

    return NextResponse.json(formatted);
  }

  // Default: PostgreSQL audit_log
  const res = await query(
    `SELECT l.log_id, u.email, l.action, l.details, l.created_at
     FROM audit_log l
     LEFT JOIN users u ON u.user_id = l.user_id
     ORDER BY l.created_at DESC
     LIMIT 200`
  );

  return NextResponse.json(res.rows);
});

