import { getDb } from './db-mongo';

export async function logAudit(action, userId = null, details = {}, request = null) {
  try {
    const db = getDb();
    let ip = 'unknown';

    if (request && request.headers) {
      const forwarded = request.headers.get('x-forwarded-for');
      if (forwarded) {
        ip = forwarded.split(',')[0].trim();
      }
    }

    // Safety guard: ensure candidate_id is never present in details
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.candidate_id;
    delete sanitizedDetails.candidateId;

    await db.collection('audit_logs').insertOne({
      user_id: userId,
      action,
      ip,
      timestamp: new Date(),
      details: sanitizedDetails,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

