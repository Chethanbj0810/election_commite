// scripts/seed-booths.js
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.PG_URL });
  try {
    await client.connect();
    const consts = await client.query('SELECT constituency_id, name FROM constituency');

    for (const c of consts.rows) {
      // Check if booth already exists
      const existing = await client.query(
        'SELECT booth_id FROM polling_booth WHERE constituency_id = $1',
        [c.constituency_id]
      );
      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO polling_booth (constituency_id, location, capacity) VALUES ($1, $2, $3)',
          [c.constituency_id, `Community Center & Polling Booth, ${c.name}`, 500]
        );
      }

      // Check if candidate exists for election 1
      const candExist = await client.query(
        'SELECT candidate_id FROM candidate WHERE constituency_id = $1 AND election_id = 1',
        [c.constituency_id]
      );
      if (candExist.rows.length === 0) {
        await client.query(
          'INSERT INTO candidate (name, party_id, constituency_id, election_id) VALUES ($1, 1, $2, 1)',
          [`Candidate ${c.name} A`, c.constituency_id]
        );
        await client.query(
          'INSERT INTO candidate (name, party_id, constituency_id, election_id) VALUES ($1, 2, $2, 1)',
          [`Candidate ${c.name} B`, c.constituency_id]
        );
      }
    }

    console.log('Seeded booths and candidates across all constituencies successfully.');
  } catch (err) {
    console.error('Failed to seed booths/candidates:', err);
  } finally {
    await client.end();
  }
}

main();

