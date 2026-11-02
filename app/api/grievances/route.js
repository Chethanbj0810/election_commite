import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db-mongo';
import { query } from '@/lib/db-postgres';
import { withAuth } from '@/lib/auth';
import { grievanceSchema } from '@/lib/validators';
import { getEmbedding, toVectorLiteral } from '@/lib/embeddings';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const POST = withAuth(['voter'], async (req, _ctx, session) => {
  const body = await req.json();
  const { category, text } = grievanceSchema.parse(body);

  const db = getDb();
  const doc = {
    voter_id: session.voterId,
    constituency_id: session.constituencyId,
    category,
    text,
    status: 'open',
    embedded: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const insertRes = await db.collection('grievances').insertOne(doc);
  const grievanceId = insertRes.insertedId.toString();

  let embedded = false;
  try {
    const embedding = await getEmbedding(text);
    await query(
      `INSERT INTO grievance_embedding (grievance_id, constituency_id, embedding)
       VALUES ($1, $2, $3::vector)`,
      [grievanceId, session.constituencyId, toVectorLiteral(embedding)]
    );

    await db.collection('grievances').updateOne(
      { _id: insertRes.insertedId },
      { $set: { embedded: true, updated_at: new Date() } }
    );
    embedded = true;
  } catch (embedErr) {
    console.error('Failed to generate/store embedding for grievance:', embedErr);
  }

  await logAudit('GRIEVANCE_CREATED', session.userId, { grievanceId, category }, req);

  return NextResponse.json({ id: grievanceId, embedded }, { status: 201 });
});

export const GET = withAuth(['voter', 'officer', 'admin'], async (req, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const db = getDb();

  const filter = {};

  if (session.role === 'voter') {
    filter.voter_id = session.voterId;
  } else {
    const statusParam = searchParams.get('status');
    const categoryParam = searchParams.get('category');
    const constituencyIdParam = searchParams.get('constituencyId');

    if (statusParam) filter.status = statusParam;
    if (categoryParam) filter.category = categoryParam;
    if (constituencyIdParam) filter.constituency_id = parseInt(constituencyIdParam, 10);
  }

  const list = await db
    .collection('grievances')
    .find(filter)
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();

  const formatted = list.map((doc) => ({
    ...doc,
    _id: doc._id.toString(),
  }));

  return NextResponse.json(formatted);
});

