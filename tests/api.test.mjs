// tests/api.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json().catch(() => ({}));

  let cookie = null;
  const setCookieHeaders = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);

  for (const header of setCookieHeaders) {
    const parts = header.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith('token=')) {
        cookie = trimmed;
        break;
      }
    }
    if (cookie) break;
  }

  return { res, body, cookie };
}

test('1. login v1 succeeds (200, role voter)', async () => {
  const { res, body, cookie } = await login('v1@evote.test', 'Voter@123');
  assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
  assert.equal(body.role, 'voter');
  assert.ok(cookie, 'Expected token cookie to be set');
});

test('2. unauthenticated GET /api/voter/dashboard -> 401', async () => {
  const res = await fetch(`${BASE_URL}/api/voter/dashboard`);
  const body = await res.json().catch(() => ({}));
  assert.equal(res.status, 401);
  assert.equal(body.error, 'Not authenticated');
});

test('3. voter GET /api/audit-logs -> 403', async () => {
  const { cookie } = await login('v1@evote.test', 'Voter@123');
  const res = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { Cookie: cookie },
  });
  const body = await res.json().catch(() => ({}));
  assert.equal(res.status, 403);
  assert.equal(body.error, 'Forbidden');
});

test('4. register with dob 2015-01-01 -> 400 (underage)', async () => {
  const underagePayload = {
    name: 'Underage Citizen',
    email: `underage_${Date.now()}@evote.test`,
    password: 'Password@123',
    dob: '2015-01-01',
    constituencyId: 1,
  };

  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(underagePayload),
  });

  const body = await res.json().catch(() => ({}));
  assert.equal(res.status, 400);
  assert.match(body.error || '', /18 years old/i);
});

test('5. v1 POST /api/vote {electionId:1,candidateId:1,boothId:1} -> 200', async () => {
  const { cookie } = await login('v1@evote.test', 'Voter@123');
  const res = await fetch(`${BASE_URL}/api/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ electionId: 1, candidateId: 1, boothId: 1 }),
  });

  const body = await res.json().catch(() => ({}));
  assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
  assert.equal(body.message, 'Vote cast successfully');
});

test('6. v1 votes again -> 409 and message contains "already voted"', async () => {
  const { cookie } = await login('v1@evote.test', 'Voter@123');
  const res = await fetch(`${BASE_URL}/api/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ electionId: 1, candidateId: 1, boothId: 1 }),
  });

  const body = await res.json().catch(() => ({}));
  assert.equal(res.status, 409);
  assert.match(body.error || '', /already voted/i);
});

test('7. v2 votes for candidateId 3 (other constituency) -> 409 invalid candidate', async () => {
  const { cookie } = await login('v2@evote.test', 'Voter@123');
  const res = await fetch(`${BASE_URL}/api/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ electionId: 1, candidateId: 3, boothId: 1 }),
  });

  const body = await res.json().catch(() => ({}));
  assert.equal(res.status, 409);
  assert.match(body.error || '', /invalid candidate/i);
});

test('8. admin GET /api/analytics/summary?electionId=1 -> totalVotes === votedCount', async () => {
  const { cookie } = await login('admin@evote.test', 'Admin@123');
  const res = await fetch(`${BASE_URL}/api/analytics/summary?electionId=1`, {
    headers: { Cookie: cookie },
  });

  const body = await res.json().catch(() => ({}));
  assert.equal(res.status, 200);
  assert.equal(typeof body.totalVotes, 'number');
  assert.equal(typeof body.votedCount, 'number');
  assert.equal(body.totalVotes, body.votedCount);
});

test('9. admin PUT election 1 status CLOSED, then v2 votes candidateId 2 -> 409 "election not open"', async () => {
  const { cookie: adminCookie } = await login('admin@evote.test', 'Admin@123');

  // Move status to CLOSED
  const updateRes = await fetch(`${BASE_URL}/api/elections/1`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      title: 'General Election 2026',
      startDate: new Date(Date.now() - 86400000).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'CLOSED',
    }),
  });
  assert.equal(updateRes.status, 200);

  // Now v2 attempts to vote
  const { cookie: v2Cookie } = await login('v2@evote.test', 'Voter@123');
  const voteRes = await fetch(`${BASE_URL}/api/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: v2Cookie,
    },
    body: JSON.stringify({ electionId: 1, candidateId: 2, boothId: 1 }),
  });

  const voteBody = await voteRes.json().catch(() => ({}));
  assert.equal(voteRes.status, 409);
  assert.match(voteBody.error || '', /election not open/i);
});

