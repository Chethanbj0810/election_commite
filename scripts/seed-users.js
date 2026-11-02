// scripts/seed-users.js
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const USERS_TO_SEED = [
  { email: 'admin@evote.test', password: 'Admin@123' },
  { email: 'officer@evote.test', password: 'Officer@123' },
  { email: 'v1@evote.test', password: 'Voter@123' },
  { email: 'v2@evote.test', password: 'Voter@123' },
];

async function main() {
  const connectionString = process.env.PG_URL;
  if (!connectionString) {
    console.error('Error: PG_URL environment variable is required.');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    for (const u of USERS_TO_SEED) {
      const hash = await bcrypt.hash(u.password, 10);
      const res = await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hash, u.email]
      );

      if (res.rowCount === 0) {
        console.error(`Error: No user row updated for ${u.email}`);
      } else {
        console.log(`Updated real bcrypt password hash for ${u.email}`);
      }
    }

    console.log('User password seeding completed successfully.');
  } catch (err) {
    console.error('Failed to seed user passwords:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

