/**
 * GitHub Dataset Generator
 * 100 real repository records - fetched from GitHub API with caching
 */

import type { Dataset, Question } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'benchmarks/fixtures/github-top-100.json');

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  owner: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  topics: string[];
}

/**
 * Fetch top repositories from GitHub API
 * Uses cache if available to avoid rate limiting
 */
export async function fetchGitHubRepos(count: number = 100): Promise<Repository[]> {
  // Check cache first
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      if (cached.length >= count) {
        console.log('📦 Using cached GitHub data');
        return cached.slice(0, count);
      }
    } catch {
      // Cache invalid, will fetch fresh
    }
  }

  // Check for GITHUB_TOKEN
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('⚠️ GITHUB_TOKEN not set - using fallback data');
    return generateFallbackRepos(count);
  }

  console.log('🌐 Fetching from GitHub API...');
  
  try {
    const repos: Repository[] = [];
    const perPage = 100;
    const pages = Math.ceil(count / perPage);

    for (let page = 1; page <= pages; page++) {
      const response = await fetch(
        `https://api.github.com/search/repositories?q=stars:>10000&sort=stars&order=desc&per_page=${perPage}&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GOON-Benchmark',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      for (const repo of data.items) {
        repos.push({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          owner: repo.owner.login,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          language: repo.language,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          topics: repo.topics || [],
        });
      }
    }

    // Cache results
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(repos.slice(0, count), null, 2));
    console.log('💾 Cached GitHub data');

    return repos.slice(0, count);
  } catch (error) {
    console.warn('⚠️ GitHub API failed, using fallback:', error);
    return generateFallbackRepos(count);
  }
}

/**
 * Generate fallback repo data when API unavailable
 */
function generateFallbackRepos(count: number): Repository[] {
  const languages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', null];
  const owners = ['facebook', 'google', 'microsoft', 'vercel', 'nodejs', 'rust-lang', 'golang'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: 1000000 + i,
    name: `awesome-project-${i + 1}`,
    fullName: `${owners[i % owners.length]}/awesome-project-${i + 1}`,
    description: i % 5 === 0 ? null : `An awesome project for ${languages[i % languages.length] || 'polyglot'} developers`,
    owner: owners[i % owners.length],
    stars: 100000 - i * 500,
    forks: Math.floor((100000 - i * 500) * 0.1),
    watchers: Math.floor((100000 - i * 500) * 0.05),
    language: languages[i % languages.length],
    createdAt: new Date(2015 + Math.floor(i / 20), i % 12, 1).toISOString(),
    updatedAt: new Date(2024, 10, 1).toISOString(),
    topics: ['open-source', languages[i % languages.length]?.toLowerCase() || 'misc'].filter(Boolean) as string[],
  }));
}

export const GITHUB_QUESTIONS: Question[] = [
  {
    id: 'gh-lookup-1',
    text: 'What programming language is the most starred repository written in?',
    type: 'lookup',
    expectedAnswer: 'JavaScript',
  },
  {
    id: 'gh-aggregation-1',
    text: 'What is the total number of stars across all repositories?',
    type: 'aggregation',
    expectedAnswer: 5000000,
    tolerance: 0.5,
  },
  {
    id: 'gh-filter-1',
    text: 'How many repositories are written in TypeScript?',
    type: 'filter',
    expectedAnswer: 15,
    tolerance: 0.5,
  },
  {
    id: 'gh-structure-1',
    text: 'How many repositories are in the dataset?',
    type: 'structure',
    expectedAnswer: 100,
  },
];

export async function generateGitHubDataset(): Promise<Dataset> {
  const repositories = await fetchGitHubRepos(100);
  
  const questions = GITHUB_QUESTIONS.map(q => {
    if (q.id === 'gh-lookup-1') {
      const topRepo = repositories.sort((a, b) => b.stars - a.stars)[0];
      return { ...q, expectedAnswer: topRepo?.language ?? 'Unknown' };
    }
    if (q.id === 'gh-aggregation-1') {
      const total = repositories.reduce((sum, r) => sum + r.stars, 0);
      return { ...q, expectedAnswer: total };
    }
    if (q.id === 'gh-filter-1') {
      const count = repositories.filter(r => r.language === 'TypeScript').length;
      return { ...q, expectedAnswer: count };
    }
    return q;
  });

  return {
    name: 'GitHub',
    slug: 'github',
    description: '100 top GitHub repositories - real-world data with varied structure',
    structure: 'semi-uniform',
    recordCount: 100,
    data: { repositories },
    questions,
    expectedGoonAdvantage: 'Dictionary for repeated owners/languages, column refs for sorted stars',
  };
}

