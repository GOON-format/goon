/**
 * Orders Dataset Generator
 * 50 nested order records - tests nested structure handling
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

const CUSTOMERS = [
  { name: 'Acme Corp', tier: 'enterprise' },
  { name: 'Beta Inc', tier: 'premium' },
  { name: 'Gamma LLC', tier: 'standard' },
  { name: 'Delta Co', tier: 'premium' },
  { name: 'Epsilon Ltd', tier: 'enterprise' },
];

const PRODUCTS = [
  { sku: 'WGT-100', name: 'Widget Pro', price: 29.99 },
  { sku: 'WGT-200', name: 'Widget Ultra', price: 49.99 },
  { sku: 'GDG-100', name: 'Gadget Basic', price: 19.99 },
  { sku: 'GDG-200', name: 'Gadget Plus', price: 39.99 },
  { sku: 'ACC-100', name: 'Accessory Pack', price: 9.99 },
];

const SHIPPING_METHODS = ['standard', 'express', 'overnight'] as const;
const STATUSES = ['pending', 'processing', 'shipped', 'delivered'] as const;
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
const COUNTRIES = ['USA', 'Canada', 'UK'];

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  date: string;
  customer: {
    name: string;
    email: string;
    tier: string;
  };
  items: OrderItem[];
  shipping: {
    method: string;
    address: {
      street: string;
      city: string;
      country: string;
    };
  };
  status: string;
  total: number;
}

export function generateOrders(count: number = 50): Order[] {
  const random = seededRandom(SEED);
  
  return Array.from({ length: count }, (_, i) => {
    const customer = CUSTOMERS[Math.floor(random() * CUSTOMERS.length)];
    const numItems = 1 + Math.floor(random() * 3);
    const items: OrderItem[] = [];
    
    for (let j = 0; j < numItems; j++) {
      const product = PRODUCTS[Math.floor(random() * PRODUCTS.length)];
      items.push({
        sku: product.sku,
        name: product.name,
        quantity: 1 + Math.floor(random() * 10),
        unitPrice: product.price,
      });
    }
    
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const date = new Date(2024, 0, 1 + Math.floor(random() * 365));
    
    return {
      id: `ORD-${String(i + 1).padStart(4, '0')}`,
      date: date.toISOString().split('T')[0],
      customer: {
        name: customer.name,
        email: `orders@${customer.name.toLowerCase().replace(/\s+/g, '')}.com`,
        tier: customer.tier,
      },
      items,
      shipping: {
        method: SHIPPING_METHODS[Math.floor(random() * SHIPPING_METHODS.length)],
        address: {
          street: `${100 + Math.floor(random() * 900)} Main St`,
          city: CITIES[Math.floor(random() * CITIES.length)],
          country: COUNTRIES[Math.floor(random() * COUNTRIES.length)],
        },
      },
      status: STATUSES[Math.floor(random() * STATUSES.length)],
      total: Math.round(total * 100) / 100,
    };
  });
}

export const ORDER_QUESTIONS: Question[] = [
  {
    id: 'ord-lookup-1',
    text: 'What is the status of order ORD-0010?',
    type: 'lookup',
    expectedAnswer: 'shipped',
  },
  {
    id: 'ord-lookup-2',
    text: 'What customer placed order ORD-0025?',
    type: 'lookup',
    expectedAnswer: 'Acme Corp',
  },
  {
    id: 'ord-aggregation-1',
    text: 'What is the total value of all orders?',
    type: 'aggregation',
    expectedAnswer: 15000,
    tolerance: 0.3,
  },
  {
    id: 'ord-filter-1',
    text: 'How many orders have status "shipped"?',
    type: 'filter',
    expectedAnswer: 12,
    tolerance: 0.3,
  },
  {
    id: 'ord-structure-1',
    text: 'How many orders are in the dataset?',
    type: 'structure',
    expectedAnswer: 50,
  },
];

export function generateOrdersDataset(): Dataset {
  const orders = generateOrders(50);
  
  const questions = ORDER_QUESTIONS.map(q => {
    if (q.id === 'ord-lookup-1') {
      const order = orders.find(o => o.id === 'ORD-0010');
      return { ...q, expectedAnswer: order?.status ?? q.expectedAnswer };
    }
    if (q.id === 'ord-lookup-2') {
      const order = orders.find(o => o.id === 'ORD-0025');
      return { ...q, expectedAnswer: order?.customer.name ?? q.expectedAnswer };
    }
    if (q.id === 'ord-aggregation-1') {
      const total = orders.reduce((sum, o) => sum + o.total, 0);
      return { ...q, expectedAnswer: Math.round(total) };
    }
    if (q.id === 'ord-filter-1') {
      const count = orders.filter(o => o.status === 'shipped').length;
      return { ...q, expectedAnswer: count };
    }
    return q;
  });

  return {
    name: 'Orders',
    slug: 'orders',
    description: '50 nested order records with items, shipping, customer',
    structure: 'nested',
    recordCount: 50,
    data: { orders },
    questions,
    expectedGoonAdvantage: 'Dictionary for customer names, product SKUs; column refs less applicable',
  };
}

