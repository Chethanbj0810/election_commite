import { MongoClient } from 'mongodb';

const globalForMongo = globalThis;

export function getDb() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not defined');
  }
  if (!process.env.MONGO_DB) {
    throw new Error('MONGO_DB environment variable is not defined');
  }

  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(process.env.MONGO_URI);
  }

  return globalForMongo.mongoClient.db(process.env.MONGO_DB);
}

