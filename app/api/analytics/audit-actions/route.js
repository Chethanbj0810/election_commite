import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db-mongo';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth(['admin'], async () => {
  const db = getDb();

  const agg = await db
    .collection('audit_logs')
    .aggregate([
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            action: '$action',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': -1, count: -1 } },
      { $limit: 100 },
    ])
    .toArray();

  const formatted = agg.map((item) => ({
    day: item._id.day,
    action: item._id.action,
    count: item.count,
  }));

  return NextResponse.json(formatted);
});

