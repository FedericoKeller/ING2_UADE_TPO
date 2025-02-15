export interface Config {
  port: string | number;
  mongodb: {
    uri: string;
  };
  redis: {
    host: string;
    port: number;
  };
  neo4j: {
    uri: string;
    username: string;
    password: string;
  };
  cassandra: {
    contactPoints: string[];
    localDataCenter: string;
    keyspace: string;
    username: string;
    password: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
} 