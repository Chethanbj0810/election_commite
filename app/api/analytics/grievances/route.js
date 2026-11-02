import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db-mongo';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth(['admin', 'officer'], async () => {
  const db = getDb();

  const [agg, constRes] = await Promise.all([
    db
      .collection('grievances')
      .aggregate([
        {
          $group: {
            _id: {
              category: '$category',
              constituency_id: '$constituency_id',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    query(`SELECT constituency_id, name FROM constituency`),
  ]);

  const constMap = new Map();
  for (const row of constRes.rows) {
    constMap.set(row.constituency_id, row.name);
  }

  const results = agg.map((item) => ({
    category: item._id.category,
    constituency_id: item._id.constituency_id,
    constituency_name:
      constMap.get(item._id.constituency_id) || `Constituency ${item._id.constituency_id}`,
    count: item.count,
  }));

  return NextResponse.json(results);
});

