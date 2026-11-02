import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function handleError(err) {
  if (err instanceof ZodError) {
    const message = err.issues?.[0]?.message || 'Validation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // PostgreSQL error codes
  if (err && err.code) {
    switch (err.code) {
      case '23505':
        return NextResponse.json({ error: 'Already exists (duplicate value)' }, { status: 409 });
      case '23503':
        return NextResponse.json(
          { error: 'Referenced by other records, cannot delete or invalid reference' },
          { status: 409 }
        );
      case '23514':
        return NextResponse.json({ error: 'Value violates a database rule' }, { status: 400 });
      case '23502':
        return NextResponse.json({ error: 'Required value missing' }, { status: 400 });
      case 'P0001':
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  console.error('Unhandled server error:', err);
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
}

