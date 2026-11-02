import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { query } from '@/lib/db-postgres';
import { getDb } from '@/lib/db-mongo';
import { withAuth } from '@/lib/auth';
import { getEmbedding, toVectorLiteral } from '@/lib/embeddings';

export const runtime = 'nodejs';

export const GET = withAuth(['officer', 'admin'], async (req) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  let constituencyId = null;
  const rawCId = searchParams.get('constituencyId');
  if (rawCId) {
    constituencyId = parseInt(rawCId, 10);
  }

  const embedding = await getEmbedding(q);
  const vectorStr = toVectorLiteral(embedding);

  const sqlRes = await query(
    `SELECT grievance_id, 1 - (embedding <=> $1::vector) AS similarity
     FROM grievance_embedding
     WHERE ($2::int IS NULL OR constituency_id = $2)
     ORDER BY embedding <=> $1::vector
     LIMIT 5`,
    [vectorStr, constituencyId]
  );

  if (sqlRes.rows.length === 0) {
    return NextResponse.json([]);
  }

  const matches = sqlRes.rows;
  const objectIds = matches
    .filter((m) => ObjectId.isValid(m.grievance_id))
    .map((m) => new ObjectId(m.grievance_id));

  const db = getDb();
  const mongoDocs = await db
    .collection('grievances')
    .find({ _id: { $in: objectIds } })
    .toArray();

  const docMap = new Map();
  for (const doc of mongoDocs) {
    docMap.set(doc._id.toString(), {
      ...doc,
      _id: doc._id.toString(),
    });
  }

  // Preserve the exact SQL cosine-similarity order
  const results = [];
  for (const item of matches) {
    const doc = docMap.get(item.grievance_id);
    if (doc) {
      results.push({
        ...doc,
        similarity: parseFloat(item.similarity) || 0,
      });
    }
  }

  return NextResponse.json(results);
});

