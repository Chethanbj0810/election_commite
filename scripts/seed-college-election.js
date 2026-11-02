// scripts/seed-college-election.js
const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const DEPARTMENTS = [
  { name: 'Computer Science & Engineering (CSE)', state: 'Engineering Faculty' },
  { name: 'Information Science & Engineering (ISE)', state: 'Engineering Faculty' },
  { name: 'Electronics & Communication (ECE)', state: 'Engineering Faculty' },
  { name: 'Mechanical Engineering (ME)', state: 'Engineering Faculty' },
  { name: 'Civil Engineering (CE)', state: 'Engineering Faculty' },
  { name: 'AI & Data Science (AI&DS)', state: 'Engineering Faculty' },
  { name: 'Management & Business Studies (MBA)', state: 'Management Faculty' },
  { name: 'Biotechnology & Life Sciences (BT)', state: 'Sciences Faculty' },
];

const STUDENT_PARTIES = [
  { name: 'Student Democratic Front (SDF)', symbol: 'Book' },
  { name: 'United Student Alliance (USA)', symbol: 'Torch' },
  { name: 'Progressive Student League (PSL)', symbol: 'Pen' },
  { name: 'Tech & Cultural Council (TCC)', symbol: 'Laptop' },
  { name: 'Campus Innovators Union (CIU)', symbol: 'Whistle' },
];

const CANDIDATES_BY_DEPT = [
  {
    dept: 'Computer Science & Engineering (CSE)',
    candidates: [
      { name: 'Aarav Sharma (4th Year CSE)', party: 'Student Democratic Front (SDF)' },
      { name: 'Sneha Kulkarni (3rd Year CSE)', party: 'United Student Alliance (USA)' },
      { name: 'Rohan Gupta (3rd Year CSE)', party: 'Tech & Cultural Council (TCC)' },
    ],
    booth: 'Computer Lab 3, Ground Floor Tech Block',
    capacity: 600,
  },
  {
    dept: 'Information Science & Engineering (ISE)',
    candidates: [
      { name: 'Vikram Patel (4th Year ISE)', party: 'Progressive Student League (PSL)' },
      { name: 'Ananya Deshmukh (3rd Year ISE)', party: 'Tech & Cultural Council (TCC)' },
    ],
    booth: 'ISE Dept Seminar Hall, 2nd Floor',
    capacity: 450,
  },
  {
    dept: 'Electronics & Communication (ECE)',
    candidates: [
      { name: 'Kiran Kumar (4th Year ECE)', party: 'Student Democratic Front (SDF)' },
      { name: 'Pooja Hegde (3rd Year ECE)', party: 'United Student Alliance (USA)' },
    ],
    booth: 'Digital Electronics Lab Hall, Block B',
    capacity: 500,
  },
  {
    dept: 'Mechanical Engineering (ME)',
    candidates: [
      { name: 'Rohit Verma (4th Year ME)', party: 'Campus Innovators Union (CIU)' },
      { name: 'Aditya Rao (3rd Year ME)', party: 'Progressive Student League (PSL)' },
    ],
    booth: 'Mechanical Workshop Audio-Visual Room',
    capacity: 400,
  },
  {
    dept: 'Civil Engineering (CE)',
    candidates: [
      { name: 'Siddharth Gowda (4th Year CE)', party: 'United Student Alliance (USA)' },
      { name: 'Meghana Reddy (3rd Year CE)', party: 'Student Democratic Front (SDF)' },
    ],
    booth: 'CAD Modeling Center, Civil Block',
    capacity: 350,
  },
  {
    dept: 'AI & Data Science (AI&DS)',
    candidates: [
      { name: 'Rahul Nambiar (3rd Year AI&DS)', party: 'Tech & Cultural Council (TCC)' },
      { name: 'Divya Nair (2nd Year AI&DS)', party: 'United Student Alliance (USA)' },
    ],
    booth: 'AI Innovation Hub & Robotics Lab',
    capacity: 450,
  },
  {
    dept: 'Management & Business Studies (MBA)',
    candidates: [
      { name: 'Varun Mehta (2nd Year MBA)', party: 'Student Democratic Front (SDF)' },
      { name: 'Rhea Kapoor (1st Year MBA)', party: 'Progressive Student League (PSL)' },
    ],
    booth: 'MBA Executive Conference Auditorium',
    capacity: 300,
  },
  {
    dept: 'Biotechnology & Life Sciences (BT)',
    candidates: [
      { name: 'Neha Joshi (3rd Year BT)', party: 'Campus Innovators Union (CIU)' },
      { name: 'Abhishek Roy (4th Year BT)', party: 'Student Democratic Front (SDF)' },
    ],
    booth: 'Bioinformatics Center, Science Wing',
    capacity: 300,
  },
];

const CAMPUS_GRIEVANCES = [
  {
    category: 'polling_booth',
    text: 'Long queue at the Central Library polling station during lunch hours between 1 PM and 2 PM.',
    dept: 'Computer Science & Engineering (CSE)',
  },
  {
    category: 'technical',
    text: 'The digital voting machine in Computer Lab 3 gave a continuous buzzer tone and restarted once.',
    dept: 'Computer Science & Engineering (CSE)',
  },
  {
    category: 'candidate_conduct',
    text: 'Volunteers from a student alliance were handing out printed campaign stickers inside the library reading hall.',
    dept: 'Electronics & Communication (ECE)',
  },
  {
    category: 'voter_list',
    text: 'My University USN / Roll number was missing from the 3rd year student electorate roll.',
    dept: 'Information Science & Engineering (ISE)',
  },
  {
    category: 'technical',
    text: 'Student College ID card barcode scanner was failing to scan older physical student cards.',
    dept: 'Mechanical Engineering (ME)',
  },
  {
    category: 'other',
    text: 'Wheelchair access ramp to the Main Seminar Hall was blocked by parked student scooters.',
    dept: 'Computer Science & Engineering (CSE)',
  },
];

async function main() {
  const pgClient = new Client({ connectionString: process.env.PG_URL });
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  try {
    await pgClient.connect();
    await mongoClient.connect();
    console.log('Connected to PostgreSQL and MongoDB.');

    // 1. Update Election 1 title & dates for College Student Council
    await pgClient.query(
      `UPDATE election
       SET title = 'College Student Council Elections 2026',
           status = 'ONGOING',
           start_date = now() - INTERVAL '1 day',
           end_date = now() + INTERVAL '7 days'
       WHERE election_id = 1`
    );
    console.log('Updated Election #1: "College Student Council Elections 2026"');

    // 2. Insert Student Parties
    const partyMap = new Map();
    for (const p of STUDENT_PARTIES) {
      const pRes = await pgClient.query(
        `INSERT INTO party (name, symbol)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET symbol = EXCLUDED.symbol
         RETURNING party_id, name`,
        [p.name, p.symbol]
      );
      partyMap.set(p.name, pRes.rows[0].party_id);
    }
    console.log(`Registered ${STUDENT_PARTIES.length} student parties.`);

    // 3. Insert Departments as Constituencies
    const deptMap = new Map();
    for (const d of DEPARTMENTS) {
      const cRes = await pgClient.query(
        `INSERT INTO constituency (name, state)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET state = EXCLUDED.state
         RETURNING constituency_id, name`,
        [d.name, d.state]
      );
      deptMap.set(d.name, cRes.rows[0].constituency_id);
    }
    console.log(`Registered ${DEPARTMENTS.length} college departments.`);

    // 4. Update voter 1 and voter 2 to point to CSE department
    const cseId = deptMap.get('Computer Science & Engineering (CSE)');
    if (cseId) {
      await pgClient.query('UPDATE voter SET constituency_id = $1 WHERE voter_id IN (1, 2)', [cseId]);
    }

    // 5. Seed Polling Booths and Contesting Candidates (AT LEAST 2 PER CONSTITUENCY)
    for (const item of CANDIDATES_BY_DEPT) {
      const cId = deptMap.get(item.dept);
      if (!cId) continue;

      // Ensure booth exists
      const boothRes = await pgClient.query(
        'SELECT booth_id FROM polling_booth WHERE constituency_id = $1',
        [cId]
      );
      let boothId;
      if (boothRes.rows.length === 0) {
        const bInsert = await pgClient.query(
          'INSERT INTO polling_booth (constituency_id, location, capacity) VALUES ($1, $2, $3) RETURNING booth_id',
          [cId, item.booth, item.capacity]
        );
        boothId = bInsert.rows[0].booth_id;
      } else {
        boothId = boothRes.rows[0].booth_id;
      }

      // Ensure candidates exist (at least 2!)
      for (const cand of item.candidates) {
        const pId = partyMap.get(cand.party);
        if (!pId) continue;

        await pgClient.query(
          `INSERT INTO candidate (name, party_id, constituency_id, election_id)
           VALUES ($1, $2, $3, 1)
           ON CONFLICT (election_id, constituency_id, party_id) DO UPDATE SET name = EXCLUDED.name`,
          [cand.name, pId, cId]
        );
      }

      console.log(`✓ Department [${item.dept}]:`);
      console.log(`    Booth: ${item.booth}`);
      console.log(`    Candidates: ${item.candidates.map((c) => c.name).join(' VS ')}`);
    }

    // 6. Generate simulated student votes for live charts
    const voteCheck = await pgClient.query('SELECT COUNT(*) AS count FROM vote WHERE election_id = 1');
    if (parseInt(voteCheck.rows[0].count, 10) === 0) {
      console.log('\nSimulating college student ballots for live charts...');
      const allCands = await pgClient.query('SELECT candidate_id, constituency_id FROM candidate WHERE election_id = 1');
      const allBooths = await pgClient.query('SELECT booth_id, constituency_id FROM polling_booth');

      for (const c of allCands.rows) {
        const b = allBooths.rows.find((booth) => booth.constituency_id === c.constituency_id) || allBooths.rows[0];
        const count = Math.floor(Math.random() * 35) + 12; // 12 to 47 votes per candidate
        for (let i = 0; i < count; i++) {
          await pgClient.query(
            `INSERT INTO vote (election_id, candidate_id, booth_id, cast_time)
             VALUES (1, $1, $2, date_trunc('hour', now()))`,
            [c.candidate_id, b.booth_id]
          );
        }
      }
      console.log('Simulated student ballots added.');
    }

    // 7. Seed College Grievances into MongoDB & Embeddings
    console.log('\nSeeding college campus grievances with AI vector embeddings...');
    const db = mongoClient.db(process.env.MONGO_DB);
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    for (const g of CAMPUS_GRIEVANCES) {
      const constId = deptMap.get(g.dept) || cseId || 1;
      const doc = {
        voter_id: 1,
        constituency_id: constId,
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
        [grievanceId, constId, vectorLiteral]
      );

      await db.collection('grievances').updateOne(
        { _id: mRes.insertedId },
        { $set: { embedded: true, updated_at: new Date() } }
      );
    }
    console.log('Campus grievances indexed into MongoDB & pgvector.');

    console.log('\n🎉 College Student Council Election dataset setup complete!');
  } catch (err) {
    console.error('Error seeding college election dataset:', err);
  } finally {
    await pgClient.end();
    await mongoClient.close();
  }
}

main();
