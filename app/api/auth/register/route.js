import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db-postgres';
import { registerSchema } from '@/lib/validators';
import { handleError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const phoneVal = data.phone?.trim() ? data.phone.trim() : null;

    const result = await withTransaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users(email, password_hash, role)
         VALUES($1, $2, 'voter')
         RETURNING user_id`,
        [data.email.toLowerCase().trim(), passwordHash]
      );
      const userId = userRes.rows[0].user_id;

      const voterRes = await client.query(
        `INSERT INTO voter(user_id, name, dob, constituency_id, phone)
         VALUES($1, $2, $3, $4, $5)
         RETURNING voter_id`,
        [userId, data.name.trim(), data.dob, data.constituencyId, phoneVal]
      );

      return {
        userId,
        voterId: voterRes.rows[0].voter_id,
      };
    });

    return NextResponse.json(
      { message: 'Registration successful', ...result },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}

