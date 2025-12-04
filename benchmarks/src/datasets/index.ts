/**
 * Dataset aggregator for benchmarks
 */

import type { Dataset } from '../types.js';
import { generateEmployeesDataset } from './employees.js';
import { generateOrdersDataset } from './orders.js';
import { generateAnalyticsDataset } from './analytics.js';
import { generateGitHubDataset } from './github.js';
import { generateEventsDataset } from './events.js';
import { generateConfigDataset } from './config.js';

/**
 * Generate all benchmark datasets
 * Uses seeded randomness for reproducibility
 */
export async function generateDatasets(): Promise<Dataset[]> {
  const datasets: Dataset[] = [
    generateEmployeesDataset(),
    generateOrdersDataset(),
    generateAnalyticsDataset(),
    await generateGitHubDataset(),
    generateEventsDataset(),
    generateConfigDataset(),
  ];
  
  return datasets;
}

/**
 * Get a specific dataset by slug
 */
export async function getDataset(slug: string): Promise<Dataset | undefined> {
  const datasets = await generateDatasets();
  return datasets.find(d => d.slug === slug);
}

/**
 * List available dataset slugs
 */
export function getDatasetSlugs(): string[] {
  return ['employees', 'orders', 'analytics', 'github', 'events', 'config'];
}

export * from '../types.js';
export { generateEmployeesDataset } from './employees.js';
export { generateOrdersDataset } from './orders.js';
export { generateAnalyticsDataset } from './analytics.js';
export { generateGitHubDataset } from './github.js';
export { generateEventsDataset } from './events.js';
export { generateConfigDataset } from './config.js';
