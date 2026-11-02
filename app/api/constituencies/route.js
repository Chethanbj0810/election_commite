import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { handleError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await query(
      `SELECT constituency_id, name, state
       FROM constituency
       ORDER BY name`
    );
    return NextResponse.json(res.rows);
  } catch (err) {
    return handleError(err);
  }
}

