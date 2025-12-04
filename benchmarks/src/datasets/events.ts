/**
 * Events Dataset Generator
 * 75 semi-uniform log entries - tests dictionary for log levels and services
 */

import type { Dataset, Question } from '../types.js';

const SEED = 42;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;
const SERVICES = ['auth-service', 'api-gateway', 'user-service', 'payment-service', 'notification-service'];
const ERROR_CODES = ['AUTH_FAILED', 'RATE_LIMIT', 'TIMEOUT', 'INVALID_INPUT', 'DB_ERROR'];

export interface EventLog {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  metadata?: {
    userId?: string;
    requestId?: string;
    duration?: number;
    error?: {
      code: string;
      message: string;
      stack?: string;
    };
  };
}

export function generateEvents(count: number = 75): EventLog[] {
  const random = seededRandom(SEED);
  const baseTime = new Date(2024, 10, 15, 10, 0, 0);
  
  return Array.from({ length: count }, (_, i) => {
    const levelIndex = Math.floor(random() * LOG_LEVELS.length);
    const level = LOG_LEVELS[levelIndex];
    const service = SERVICES[Math.floor(random() * SERVICES.length)];
    const time = new Date(baseTime.getTime() + i * 1000 + Math.floor(random() * 500));
    
    const event: EventLog = {
      id: `evt-${String(i + 1).padStart(5, '0')}`,
      timestamp: time.toISOString(),
      level,
      service,
      message: generateMessage(level, service, random),
    };

    // Add metadata for some events
    if (random() > 0.3) {
      event.metadata = {
        requestId: `req-${Math.floor(random() * 100000)}`,
        duration: Math.floor(random() * 500),
      };
      
      if (random() > 0.7) {
        event.metadata.userId = `user-${Math.floor(random() * 10000)}`;
      }
      
      if (level === 'ERROR') {
        event.metadata.error = {
          code: ERROR_CODES[Math.floor(random() * ERROR_CODES.length)],
          message: 'Operation failed',
          stack: random() > 0.5 ? 'Error: Operation failed\n    at process (service.ts:42)' : undefined,
        };
      }
    }

    return event;
  });
}

function generateMessage(level: string, service: string, random: () => number): string {
  const messages: Record<string, string[]> = {
    DEBUG: [
      'Processing request',
      'Cache hit for key',
      'Database query executed',
      'Response serialized',
    ],
    INFO: [
      'Request completed successfully',
      'User logged in',
      'Session created',
      'Configuration loaded',
    ],
    WARN: [
      'Rate limit approaching',
      'Slow query detected',
      'Deprecated API called',
      'Connection pool low',
    ],
    ERROR: [
      'Authentication failed',
      'Database connection lost',
      'Request timeout',
      'Invalid input received',
    ],
  };
  
  const levelMessages = messages[level] || messages.INFO;
  return `[${service}] ${levelMessages[Math.floor(random() * levelMessages.length)]}`;
}

export const EVENT_QUESTIONS: Question[] = [
  {
    id: 'evt-lookup-1',
    text: 'What is the log level of event evt-00050?',
    type: 'lookup',
    expectedAnswer: 'INFO',
  },
  {
    id: 'evt-aggregation-1',
    text: 'How many ERROR level events are there?',
    type: 'aggregation',
    expectedAnswer: 18,
    tolerance: 0.3,
  },
  {
    id: 'evt-filter-1',
    text: 'How many events are from the auth-service?',
    type: 'filter',
    expectedAnswer: 15,
    tolerance: 0.3,
  },
  {
    id: 'evt-structure-1',
    text: 'How many events are in the dataset?',
    type: 'structure',
    expectedAnswer: 75,
  },
];

export function generateEventsDataset(): Dataset {
  const logs = generateEvents(75);
  
  const questions = EVENT_QUESTIONS.map(q => {
    if (q.id === 'evt-lookup-1') {
      const event = logs.find(e => e.id === 'evt-00050');
      return { ...q, expectedAnswer: event?.level ?? q.expectedAnswer };
    }
    if (q.id === 'evt-aggregation-1') {
      const count = logs.filter(e => e.level === 'ERROR').length;
      return { ...q, expectedAnswer: count };
    }
    if (q.id === 'evt-filter-1') {
      const count = logs.filter(e => e.service === 'auth-service').length;
      return { ...q, expectedAnswer: count };
    }
    return q;
  });

  return {
    name: 'Event Logs',
    slug: 'events',
    description: '75 application log entries - semi-uniform with optional metadata',
    structure: 'semi-uniform',
    recordCount: 75,
    data: { logs },
    questions,
    expectedGoonAdvantage: 'Dictionary for log levels, services, error codes',
  };
}

