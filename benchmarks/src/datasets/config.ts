/**
 * Config Dataset Generator
 * 1 deeply nested configuration - tests deep nesting handling
 */

import type { Dataset, Question } from '../types.js';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  pool: {
    min: number;
    max: number;
    idleTimeout: number;
  };
  ssl: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  provider: 'redis' | 'memcached';
  host: string;
  port: number;
  ttl: number;
  maxSize: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  outputs: Array<{
    type: 'console' | 'file' | 'remote';
    options: Record<string, unknown>;
  }>;
}

export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
  };
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      cert?: string;
      key?: string;
    };
    cors: {
      enabled: boolean;
      origins: string[];
      methods: string[];
    };
  };
  database: {
    primary: DatabaseConfig;
    replica?: DatabaseConfig;
  };
  cache: CacheConfig;
  logging: LoggingConfig;
  features: Record<string, boolean>;
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
  };
  auth: {
    jwt: {
      secret: string;
      expiresIn: string;
      algorithm: string;
    };
    oauth: {
      google: {
        enabled: boolean;
        clientId: string;
        clientSecret: string;
      };
      github: {
        enabled: boolean;
        clientId: string;
        clientSecret: string;
      };
    };
  };
}

export function generateConfig(): AppConfig {
  return {
    app: {
      name: 'GOON Benchmark App',
      version: '1.0.0',
      environment: 'production',
      debug: false,
    },
    server: {
      host: '0.0.0.0',
      port: 8080,
      ssl: {
        enabled: true,
        cert: '/etc/ssl/certs/server.crt',
        key: '/etc/ssl/private/server.key',
      },
      cors: {
        enabled: true,
        origins: ['https://app.example.com', 'https://admin.example.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
    },
    database: {
      primary: {
        host: 'db-primary.internal',
        port: 5432,
        database: 'goon_app',
        username: 'goon_user',
        password: '${DB_PASSWORD}',
        pool: {
          min: 5,
          max: 20,
          idleTimeout: 30000,
        },
        ssl: true,
      },
      replica: {
        host: 'db-replica.internal',
        port: 5432,
        database: 'goon_app',
        username: 'goon_reader',
        password: '${DB_REPLICA_PASSWORD}',
        pool: {
          min: 2,
          max: 10,
          idleTimeout: 30000,
        },
        ssl: true,
      },
    },
    cache: {
      enabled: true,
      provider: 'redis',
      host: 'redis.internal',
      port: 6379,
      ttl: 3600,
      maxSize: 1000,
    },
    logging: {
      level: 'info',
      format: 'json',
      outputs: [
        {
          type: 'console',
          options: { colorize: false },
        },
        {
          type: 'file',
          options: { path: '/var/log/app.log', maxSize: '100MB', maxFiles: 10 },
        },
        {
          type: 'remote',
          options: { endpoint: 'https://logs.example.com/ingest', apiKey: '${LOG_API_KEY}' },
        },
      ],
    },
    features: {
      newDashboard: true,
      betaApi: false,
      darkMode: true,
      analytics: true,
      notifications: true,
      twoFactorAuth: true,
      apiRateLimit: true,
      maintenanceMode: false,
    },
    rateLimit: {
      enabled: true,
      windowMs: 60000,
      max: 100,
      skipSuccessfulRequests: false,
    },
    auth: {
      jwt: {
        secret: '${JWT_SECRET}',
        expiresIn: '24h',
        algorithm: 'HS256',
      },
      oauth: {
        google: {
          enabled: true,
          clientId: '${GOOGLE_CLIENT_ID}',
          clientSecret: '${GOOGLE_CLIENT_SECRET}',
        },
        github: {
          enabled: true,
          clientId: '${GITHUB_CLIENT_ID}',
          clientSecret: '${GITHUB_CLIENT_SECRET}',
        },
      },
    },
  };
}

export const CONFIG_QUESTIONS: Question[] = [
  {
    id: 'cfg-lookup-1',
    text: 'What port does the server run on?',
    type: 'lookup',
    expectedAnswer: 8080,
  },
  {
    id: 'cfg-lookup-2',
    text: 'What is the database pool max size for the primary database?',
    type: 'lookup',
    expectedAnswer: 20,
  },
  {
    id: 'cfg-lookup-3',
    text: 'Is SSL enabled for the server?',
    type: 'lookup',
    expectedAnswer: true,
  },
  {
    id: 'cfg-structure-1',
    text: 'How many feature flags are defined?',
    type: 'structure',
    expectedAnswer: 8,
  },
  {
    id: 'cfg-structure-2',
    text: 'How many OAuth providers are configured?',
    type: 'structure',
    expectedAnswer: 2,
  },
];

export function generateConfigDataset(): Dataset {
  const config = generateConfig();
  
  return {
    name: 'Config',
    slug: 'config',
    description: '1 deeply nested application configuration',
    structure: 'deeply-nested',
    recordCount: 1,
    data: { config },
    questions: CONFIG_QUESTIONS,
    expectedGoonAdvantage: 'Limited - deeply nested structures less suited for tabular optimization',
  };
}

