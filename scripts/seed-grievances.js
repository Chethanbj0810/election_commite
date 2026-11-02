// scripts/seed-grievances.js
const { MongoClient } = require('mongodb');
const { Client } = require('pg');

const SAMPLE_GRIEVANCES = [
  {
    category: 'polling_booth',
    text: 'Long queue and broken voting machine at the school booth causing severe delays.',
  },
  {
    category: 'voter_list',
    text: 'My name is missing from the voter list despite having a registered voter ID card.',
  },
  {
    category: 'candidate_conduct',
    text: 'Supporters of a political party were distributing pamphlets within 100 meters of the booth.',
  },
  {
    category: 'technical',
    text: 'The electronic voting machine buzzer did not beep upon pressing the ballot button.',
  },
  {
    category: 'other',
    text: 'Polling staff were uncooperative and disabled ramp accessibility for senior citizens.',
  },
];

async function main() {
  const mongoUri = process.env.MONGO_URI;
  const mongoDbName = process.env.MONGO_DB;
  const pgUrl = process.env.PG_URL;

  if (!mongoUri || !mongoDbName || !pgUrl) {
    console.error('Error: MONGO_URI, MONGO_DB, and PG_URL environment variables are required.');
    process.exit(1);
  }

  const mongoClient = new MongoClient(mongoUri);
  const pgClient = new Client({ connectionString: pgUrl });

  try {
    await mongoClient.connect();
    await pgClient.connect();

    console.log('Connected to MongoDB and PostgreSQL.');
    const db = mongoClient.db(mongoDbName);

    // Look up voter 1
    const voterRes = await pgClient.query('SELECT voter_id, constituency_id FROM voter WHERE voter_id = 1');
    const voterId = voterRes.rows[0]?.voter_id || 1;
    const constituencyId = voterRes.rows[0]?.constituency_id || 1;

    console.log('Loading Xenova/all-MiniLM-L6-v2 transformer pipeline...');
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    for (const sample of SAMPLE_GRIEVANCES) {
      const doc = {
        voter_id: voterId,
        constituency_id: constituencyId,
        category: sample.category,
        text: sample.text,
        status: 'open',
        embedded: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const res = await db.collection('grievances').insertOne(doc);
      const grievanceId = res.insertedId.toString();

      // Compute vector embedding
      const output = await extractor(sample.text, { pooling: 'mean', normalize: true });
      const embeddingArr = Array.from(output.data);
      const vectorLiteral = '[' + embeddingArr.join(',') + ']';

      // Insert into PostgreSQL grievance_embedding
      await pgClient.query(
        `INSERT INTO grievance_embedding (grievance_id, constituency_id, embedding)
         VALUES ($1, $2, $3::vector)
         ON CONFLICT (grievance_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
        [grievanceId, constituencyId, vectorLiteral]
      );

      await db.collection('grievances').updateOne(
        { _id: res.insertedId },
        { $set: { embedded: true, updated_at: new Date() } }
      );

      console.log(`Inserted & embedded sample grievance: "${sample.text.slice(0, 40)}..."`);
    }

    console.log('Sample grievances and vector embeddings seeded successfully.');
  } catch (err) {
    console.error('Failed to seed grievances:', err);
    process.exit(1);
  } finally {
    await mongoClient.close();
    await pgClient.end();
  }
}

main();

