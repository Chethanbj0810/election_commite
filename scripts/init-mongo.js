// scripts/init-mongo.js
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB;

  if (!uri || !dbName) {
    console.error('Error: MONGO_URI and MONGO_DB environment variables are required.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`Connected to MongoDB at ${uri}, database: ${dbName}`);
    const db = client.db(dbName);

    // Indexes for grievances
    const grievances = db.collection('grievances');
    const idx1 = await grievances.createIndex({ constituency_id: 1, status: 1 });
    console.log(`Created index on grievances: ${idx1}`);

    const idx2 = await grievances.createIndex({ voter_id: 1 });
    console.log(`Created index on grievances: ${idx2}`);

    const idx3 = await grievances.createIndex({ text: 'text' });
    console.log(`Created text index on grievances: ${idx3}`);

    // Indexes for audit_logs
    const auditLogs = db.collection('audit_logs');
    const idx4 = await auditLogs.createIndex({ timestamp: -1 });
    console.log(`Created index on audit_logs: ${idx4}`);

    const idx5 = await auditLogs.createIndex({ action: 1 });
    console.log(`Created index on audit_logs: ${idx5}`);

    console.log('MongoDB initialization and index creation completed successfully.');
  } catch (err) {
    console.error('Failed to initialize MongoDB indexes:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

