import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db-mongo';
import { withAuth } from '@/lib/auth';
import { grievanceStatusSchema } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export const PATCH = withAuth(['officer', 'admin'], async (req, { params }, session) => {
  const { id } = await params;

  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid grievance ID format' }, { status: 400 });
  }

  const body = await req.json();
  const { status } = grievanceStatusSchema.parse(body);

  const db = getDb();
  const res = await db.collection('grievances').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updated_at: new Date() } }
  );

  if (res.matchedCount === 0) {
    return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
  }

  await logAudit('GRIEVANCE_UPDATED', session.userId, { grievanceId: id, status }, req);

  return NextResponse.json({ message: 'Grievance updated successfully' });
});

