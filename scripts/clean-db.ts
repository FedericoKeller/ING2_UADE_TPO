import mongoose from 'mongoose';
import { createClient } from 'redis';
import neo4j from 'neo4j-driver';
import { Client } from 'cassandra-driver';
import config from '../src/config/config';

async function cleanMongoDB() {
  try {
    await mongoose.connect(config.mongodb.uri);
    await mongoose.connection.dropDatabase();
    console.log('MongoDB cleaned successfully');
  } catch (error) {
    console.error('Error cleaning MongoDB:', error);
  }
}

async function cleanRedis() {
  try {
    const client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port
      }
    });
    await client.connect();
    await client.flushAll();
    await client.disconnect();
    console.log('Redis cleaned successfully');
  } catch (error) {
    console.error('Error cleaning Redis:', error);
  }
}

async function cleanNeo4j() {
  const driver = neo4j.driver(
    config.neo4j.uri,
    neo4j.auth.basic('neo4j', 'password')
  );
  const session = driver.session();
  try {
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('Neo4j cleaned successfully');
  } catch (error) {
    console.error('Error cleaning Neo4j:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

async function cleanCassandra() {
  try {
    const client = new Client({
      contactPoints: config.cassandra.contactPoints,
      localDataCenter: config.cassandra.localDataCenter,
      keyspace: config.cassandra.keyspace,
    });
    await client.connect();
    await client.execute('TRUNCATE price_history');
    await client.execute('TRUNCATE product_changes');
    await client.shutdown();
    console.log('Cassandra cleaned successfully');
  } catch (error) {
    console.error('Error cleaning Cassandra:', error);
  }
}

async function cleanDatabases() {
  console.log('Cleaning databases...');
  await Promise.all([
    cleanMongoDB(),
    cleanRedis(),
    cleanNeo4j(),
    cleanCassandra(),
  ]);
  console.log('All databases cleaned successfully');
  process.exit(0);
}

cleanDatabases(); 