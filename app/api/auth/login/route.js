import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { loginSchema } from '@/lib/validators';
import { signToken, COOKIE_OPTIONS } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { handleError } from '@/lib/errors';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const userRes = await query(
      `SELECT user_id, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = userRes.rows[0];
    if (!user) {
      await logAudit('LOGIN_FAILED', null, { email }, request);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      await logAudit('LOGIN_FAILED', user.user_id, { email }, request);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    let voterId = null;
    let constituencyId = null;

    if (user.role === 'voter') {
      const voterRes = await query(
        `SELECT voter_id, constituency_id
         FROM voter
         WHERE user_id = $1`,
        [user.user_id]
      );
      if (voterRes.rows.length > 0) {
        voterId = voterRes.rows[0].voter_id;
        constituencyId = voterRes.rows[0].constituency_id;
      }
    }

    const payload = {
      userId: user.user_id,
      role: user.role,
      email: user.email,
      ...(voterId !== null ? { voterId, constituencyId } : {}),
    };

    const token = await signToken(payload);
    const cookieStore = await cookies();
    cookieStore.set('token', token, COOKIE_OPTIONS);

    await logAudit('LOGIN_SUCCESS', user.user_id, { role: user.role }, request);

    return NextResponse.json({ role: user.role });
  } catch (err) {
    return handleError(err);
  }
}

