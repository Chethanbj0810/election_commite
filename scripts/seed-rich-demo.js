// scripts/seed-rich-demo.js
const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const EXTRA_PARTIES = [
  { name: 'Progressive Citizens Party', symbol: 'Torch' },
  { name: 'Farmers & Labor Union', symbol: 'Tractor' },
  { name: 'Green Ecological Coalition', symbol: 'Tree' },
];

const EXTRA_VOTERS = [
  { name: 'Ramesh Hegde', email: 'ramesh.h@evote.test', dob: '1988-11-14', constituencyId: 2, phone: '9845123456' },
  { name: 'Ananya Rao', email: 'ananya.r@evote.test', dob: '2003-08-25', constituencyId: 6, phone: '9845654321' },
  { name: 'Siddharth Sen', email: 'siddharth@evote.test', dob: '1992-04-12', constituencyId: 3, phone: '9845987654' },
  { name: 'Farooq Ahmed', email: 'farooq@evote.test', dob: '1985-09-30', constituencyId: 1, phone: '9845112233' },
  { name: 'Lakshmi Devi', email: 'lakshmi.d@evote.test', dob: '1976-12-05', constituencyId: 1, phone: '9845445566' },
];

const RICH_GRIEVANCES = [
  {
    category: 'polling_booth',
    text: 'The queue at Govt High School Jayanagar is moving extremely slowly with only one officer checking identification.',
    constituency_id: 1,
  },
  {
    category: 'technical',
    text: 'Electronic Voting Machine (EVM) in booth 2 gave two beeps and the green LED indicator was flickering.',
    constituency_id: 1,
  },
  {
    category: 'voter_list',
    text: 'My name has been wrongly spelled as K Chethan instead of Chethan B J in the official electoral roll.',
    constituency_id: 1,
  },
  {
    category: 'candidate_conduct',
    text: 'Volunteers wearing party scarves were distributing tea and leaflets within 50 meters of the voting gate.',
    constituency_id: 2,
  },
  {
    category: 'technical',
    text: 'The biometric fingerprint verification scanner failed to detect the fingerprints of several elderly citizens.',
    constituency_id: 2,
  },
  {
    category: 'other',
    text: 'Wheelchair ramp is blocked by parked two-wheelers, making it impossible for disabled voters to enter.',
    constituency_id: 1,
  },
];

async function main() {
  const pgClient = new Client({ connectionString: process.env.PG_URL });
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  try {
    await pgClient.connect();
    await mongoClient.connect();
    console.log('Connected to PostgreSQL and MongoDB.');

    // 1. Insert additional parties
    for (const p of EXTRA_PARTIES) {
      await pgClient.query(
        'INSERT INTO party (name, symbol) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [p.name, p.symbol]
      );
    }
    console.log('Extra parties seeded.');

    // 2. Insert extra voters
    const hash = await bcrypt.hash('Voter@123', 10);
    for (const v of EXTRA_VOTERS) {
      const uRes = await pgClient.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, 'voter')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING user_id`,
        [v.email, hash]
      );
      const userId = uRes.rows[0].user_id;

      await pgClient.query(
        `INSERT INTO voter (user_id, name, dob, constituency_id, phone)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, v.name, v.dob, v.constituencyId, v.phone]
      );
    }
    console.log('Extra voters seeded.');

    // 3. Add simulated votes for live charts
    // Check if votes already exist
    const voteCountRes = await pgClient.query('SELECT COUNT(*) AS count FROM vote WHERE election_id = 1');
    if (parseInt(voteCountRes.rows[0].count, 10) === 0) {
      console.log('Seeding simulated votes for election 1...');
      // Cast votes directly into vote table to populate live charts
      const candidateList = await pgClient.query('SELECT candidate_id, constituency_id FROM candidate WHERE election_id = 1');
      const boothList = await pgClient.query('SELECT booth_id, constituency_id FROM polling_booth');

      for (const cand of candidateList.rows) {
        // Distribute some votes
        const numVotes = Math.floor(Math.random() * 45) + 15;
        const matchingBooth = boothList.rows.find((b) => b.constituency_id === cand.constituency_id) || boothList.rows[0];

        for (let i = 0; i < numVotes; i++) {
          await pgClient.query(
            `INSERT INTO vote (election_id, candidate_id, booth_id, cast_time)
             VALUES (1, $1, $2, date_trunc('hour', now()))`,
            [cand.candidate_id, matchingBooth.booth_id]
          );
        }
      }
      console.log('Simulated votes generated for election charts.');
    }

    // 4. Seed MongoDB grievances with vectors
    const db = mongoClient.db(process.env.MONGO_DB);
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    for (const g of RICH_GRIEVANCES) {
      const doc = {
        voter_id: 1,
        constituency_id: g.constituency_id,
        category: g.category,
        text: g.text,
        status: 'open',
        embedded: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mRes = await db.collection('grievances').insertOne(doc);
      const grievanceId = mRes.insertedId.toString();

      const output = await extractor(g.text, { pooling: 'mean', normalize: true });
      const embeddingArr = Array.from(output.data);
      const vectorLiteral = '[' + embeddingArr.join(',') + ']';

      await pgClient.query(
        `INSERT INTO grievance_embedding (grievance_id, constituency_id, embedding)
         VALUES ($1, $2, $3::vector)
         ON CONFLICT (grievance_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
        [grievanceId, g.constituency_id, vectorLiteral]
      );

      await db.collection('grievances').updateOne(
        { _id: mRes.insertedId },
        { $set: { embedded: true, updated_at: new Date() } }
      );
    }
    console.log('Rich citizen grievances and embeddings seeded.');

    console.log('All example datasets successfully seeded into PostgreSQL and MongoDB!');
  } catch (err) {
    console.error('Error seeding rich demo dataset:', err);
  } finally {
    await pgClient.end();
    await mongoClient.close();
  }
}

main();

