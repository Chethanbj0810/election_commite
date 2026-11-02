// scripts/seed-constituencies.js
const { Client } = require('pg');

const CONSTITUENCIES = [
  { name: 'Bengaluru Central', state: 'Karnataka' },
  { name: 'Bengaluru North', state: 'Karnataka' },
  { name: 'Bengaluru Rural', state: 'Karnataka' },
  { name: 'Mangaluru', state: 'Karnataka' },
  { name: 'Hubballi-Dharwad', state: 'Karnataka' },
  { name: 'Belagavi', state: 'Karnataka' },
  { name: 'Shivamogga', state: 'Karnataka' },
  { name: 'Tumakuru', state: 'Karnataka' },
  { name: 'Udupi-Chikkamagaluru', state: 'Karnataka' },
  { name: 'Ballari', state: 'Karnataka' },
];

async function main() {
  const client = new Client({ connectionString: process.env.PG_URL });
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    for (const c of CONSTITUENCIES) {
      await client.query(
        'INSERT INTO constituency (name, state) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [c.name, c.state]
      );
    }

    const res = await client.query('SELECT constituency_id, name, state FROM constituency ORDER BY name');
    console.log(`Successfully updated constituencies table (${res.rows.length} total):`);
    res.rows.forEach((r) => console.log(`  - [ID ${r.constituency_id}] ${r.name} (${r.state})`));
  } catch (err) {
    console.error('Failed to seed constituencies:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
