/**
 * Analytics Dataset Generator
 * 60 days of time-series metrics - tests column references for repeated dates
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

export interface DailyMetrics {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  revenue: number;
}

export function generateAnalytics(days: number = 60): DailyMetrics[] {
  const random = seededRandom(SEED);
  const startDate = new Date(2024, 9, 1); // October 1, 2024
  
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Base values with some weekly patterns
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseMultiplier = isWeekend ? 0.7 : 1.0;
    
    const pageViews = Math.floor((8000 + random() * 4000) * baseMultiplier);
    const uniqueVisitors = Math.floor(pageViews * (0.4 + random() * 0.2));
    
    return {
      date: date.toISOString().split('T')[0],
      pageViews,
      uniqueVisitors,
      bounceRate: Math.round((30 + random() * 30) * 100) / 100,
      avgSessionDuration: Math.round((120 + random() * 180) * 100) / 100,
      conversions: Math.floor(uniqueVisitors * (0.02 + random() * 0.03)),
      revenue: Math.round((pageViews * 0.1 + random() * 500) * 100) / 100,
    };
  });
}

export const ANALYTICS_QUESTIONS: Question[] = [
  {
    id: 'ana-lookup-1',
    text: 'What were the page views on 2024-10-15?',
    type: 'lookup',
    expectedAnswer: 9500,
  },
  {
    id: 'ana-aggregation-1',
    text: 'What is the total revenue across all days?',
    type: 'aggregation',
    expectedAnswer: 50000,
    tolerance: 0.3,
  },
  {
    id: 'ana-aggregation-2',
    text: 'What is the average bounce rate?',
    type: 'aggregation',
    expectedAnswer: 45,
    tolerance: 0.2,
  },
  {
    id: 'ana-filter-1',
    text: 'How many days had more than 10000 page views?',
    type: 'filter',
    expectedAnswer: 20,
    tolerance: 0.4,
  },
  {
    id: 'ana-structure-1',
    text: 'How many days of data are in the dataset?',
    type: 'structure',
    expectedAnswer: 60,
  },
];

export function generateAnalyticsDataset(): Dataset {
  const metrics = generateAnalytics(60);
  
  const questions = ANALYTICS_QUESTIONS.map(q => {
    if (q.id === 'ana-lookup-1') {
      const day = metrics.find(m => m.date === '2024-10-15');
      return { ...q, expectedAnswer: day?.pageViews ?? q.expectedAnswer };
    }
    if (q.id === 'ana-aggregation-1') {
      const total = metrics.reduce((sum, m) => sum + m.revenue, 0);
      return { ...q, expectedAnswer: Math.round(total) };
    }
    if (q.id === 'ana-aggregation-2') {
      const avg = metrics.reduce((sum, m) => sum + m.bounceRate, 0) / metrics.length;
      return { ...q, expectedAnswer: Math.round(avg * 10) / 10 };
    }
    if (q.id === 'ana-filter-1') {
      const count = metrics.filter(m => m.pageViews > 10000).length;
      return { ...q, expectedAnswer: count };
    }
    return q;
  });

  return {
    name: 'Analytics',
    slug: 'analytics',
    description: '60 days of web analytics metrics - time series with numeric data',
    structure: 'time-series',
    recordCount: 60,
    data: { metrics },
    questions,
    expectedGoonAdvantage: 'Column refs for similar sequential values, compact literals for consistency',
  };
}

