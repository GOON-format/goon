/**
 * Employees Dataset Generator
 * 100 uniform records - tests string dictionary and column references
 */

import type { Dataset, Question } from '../types.js';

const SEED = 42;

// Deterministic pseudo-random generator
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const FIRST_NAMES = [
  'Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Karen', 'Leo', 'Mia', 'Nick', 'Olivia', 'Paul',
  'Quinn', 'Rachel', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas'
];

const DEPARTMENTS = ['Engineering', 'Product', 'Marketing', 'Sales', 'HR'];

export interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  salary: number;
  yearsExperience: number;
  active: boolean;
}

export function generateEmployees(count: number = 100): Employee[] {
  const random = seededRandom(SEED);
  
  return Array.from({ length: count }, (_, i) => {
    const firstName = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    const department = DEPARTMENTS[Math.floor(random() * DEPARTMENTS.length)];
    
    return {
      id: i + 1,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@company.com`,
      department,
      salary: 50000 + Math.floor(random() * 100000),
      yearsExperience: Math.floor(random() * 20),
      active: random() > 0.2,
    };
  });
}

export const EMPLOYEE_QUESTIONS: Question[] = [
  {
    id: 'emp-lookup-1',
    text: 'What is the department of employee with id 42?',
    type: 'lookup',
    expectedAnswer: 'Marketing', // Will be calculated from seeded data
  },
  {
    id: 'emp-lookup-2',
    text: 'What is the salary of employee with id 10?',
    type: 'lookup',
    expectedAnswer: 89234, // Will be calculated from seeded data
  },
  {
    id: 'emp-aggregation-1',
    text: 'How many employees are in the Engineering department?',
    type: 'aggregation',
    expectedAnswer: 20, // Approximately 20% of 100
    tolerance: 0.3,
  },
  {
    id: 'emp-aggregation-2',
    text: 'What is the average salary of all employees?',
    type: 'aggregation',
    expectedAnswer: 100000,
    tolerance: 0.2,
  },
  {
    id: 'emp-filter-1',
    text: 'How many employees have more than 10 years of experience?',
    type: 'filter',
    expectedAnswer: 45,
    tolerance: 0.3,
  },
  {
    id: 'emp-structure-1',
    text: 'How many employees are in the dataset?',
    type: 'structure',
    expectedAnswer: 100,
  },
  {
    id: 'emp-structure-2',
    text: 'What fields does each employee record have?',
    type: 'structure',
    expectedAnswer: ['id', 'name', 'email', 'department', 'salary', 'yearsExperience', 'active'],
  },
];

export function generateEmployeesDataset(): Dataset {
  const employees = generateEmployees(100);
  
  // Update expected answers based on actual generated data
  const questions = EMPLOYEE_QUESTIONS.map(q => {
    if (q.id === 'emp-lookup-1') {
      const emp = employees.find(e => e.id === 42);
      return { ...q, expectedAnswer: emp?.department ?? q.expectedAnswer };
    }
    if (q.id === 'emp-lookup-2') {
      const emp = employees.find(e => e.id === 10);
      return { ...q, expectedAnswer: emp?.salary ?? q.expectedAnswer };
    }
    if (q.id === 'emp-aggregation-1') {
      const count = employees.filter(e => e.department === 'Engineering').length;
      return { ...q, expectedAnswer: count };
    }
    if (q.id === 'emp-aggregation-2') {
      const avg = employees.reduce((sum, e) => sum + e.salary, 0) / employees.length;
      return { ...q, expectedAnswer: Math.round(avg) };
    }
    if (q.id === 'emp-filter-1') {
      const count = employees.filter(e => e.yearsExperience > 10).length;
      return { ...q, expectedAnswer: count };
    }
    return q;
  });

  return {
    name: 'Employees',
    slug: 'employees',
    description: '100 employee records with uniform structure - tests dictionary for departments',
    structure: 'uniform',
    recordCount: 100,
    data: { employees },
    questions,
    expectedGoonAdvantage: 'String dictionary for repeated departments, column refs for sorted data',
  };
}

