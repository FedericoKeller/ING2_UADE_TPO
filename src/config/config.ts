import dotenv from 'dotenv';
import { Config } from '../types/config';

dotenv.config();

const config: Config = {
  port: process.env.PORT || 3000,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
  },
  cassandra: {
    contactPoints: (process.env.CASSANDRA_CONTACT_POINTS || 'localhost').split(','),
    localDataCenter: process.env.CASSANDRA_LOCAL_DC || 'datacenter1',
    keyspace: process.env.CASSANDRA_KEYSPACE || 'ecommerce',
    username: process.env.CASSANDRA_USER || 'cassandra',
    password: process.env.CASSANDRA_PASSWORD || 'cassandra',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};

export default config; 