import mongoose from 'mongoose';
import { createClient } from 'redis';
import neo4j from 'neo4j-driver';
import { Client } from 'cassandra-driver';
import config from './config';

// MongoDB Connection
export const connectMongoDB = async () => {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Redis Connection
export const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis connected successfully'));

// Neo4j Connection
export const neo4jDriver = neo4j.driver(
  config.neo4j.uri,
  neo4j.auth.basic(config.neo4j.username, config.neo4j.password)
);

// Cassandra Connection
export const cassandraClient = new Client({
  contactPoints: config.cassandra.contactPoints,
  localDataCenter: config.cassandra.localDataCenter,
  keyspace: config.cassandra.keyspace,
});

export const connectDatabases = async () => {
  try {
    // Connect MongoDB
    await connectMongoDB();

    // Connect Redis
    await redisClient.connect();

    // Verify Neo4j connection
    const neo4jSession = neo4jDriver.session();
    await neo4jSession.run('RETURN 1');
    neo4jSession.close();
    console.log('Neo4j connected successfully');

    // Connect Cassandra
    await cassandraClient.connect();
    console.log('Cassandra connected successfully');

  } catch (error) {
    console.error('Error connecting to databases:', error);
    process.exit(1);
  }
};

export const closeDatabases = async () => {
  try {
    await mongoose.disconnect();
    await redisClient.disconnect();
    await neo4jDriver.close();
    await cassandraClient.shutdown();
    console.log('All database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
    process.exit(1);
  }
}; 