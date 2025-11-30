
export type AnimalType = 'bird' | 'owl' | 'fox' | 'bear' | 'cat' | 'rabbit' | 'dog' | 'squirrel';
export type ThemeType = 'default' | 'dark' | 'fox' | 'whale_shark';

export interface User {
  id: string;
  name: string;
  animal: AnimalType;
  customAvatar?: string; // base64
  email: string; // Email is now mandatory and serves as the sync key
}

export type SplitMode = 'equal' | 'custom';

export interface Split {
  userId: string;
  amount: number;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  payerId: string;
  date: number; // timestamp
  category: string;
  customCategory?: string; // For 'other' type
  splitMode: SplitMode;
  splits: Split[];
  receiptImage?: string; // base64
}

export interface Project {
  id: string;
  name: string;
  currency: string;
  startDate?: number;
  endDate?: number;
  members: User[];
  memberEmails: string[]; // List of emails that have access to this project
  expenses: Expense[];
  inviteCode: string;
  ownerEmail: string;
}

export interface Transaction {
  fromId: string;
  toId: string;
  amount: number;
}

export interface Balances {
  [userId: string]: number;
}
