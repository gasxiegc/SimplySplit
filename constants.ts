

import { AnimalType, ThemeType } from './types';

// Simplified SVG paths for our "Zen" animals
export const ANIMAL_PATHS: Record<AnimalType, { viewBox: string; path: string; color: string }> = {
  bird: {
    viewBox: "0 0 24 24",
    path: "M12 2C9 2 4 5 4 10C4 13.5 6 16 8 18C8 20 7 22 5 22C9 22 13 22 16 20C19 18 21 14 21 10C21 5 17 2 12 2ZM14 8C14.55 8 15 8.45 15 9C15 9.55 14.55 10 14 10C13.45 10 13 9.55 13 9C13 8.45 13.45 8 14 8Z",
    color: "#8fa892" // Nature Green
  },
  owl: {
    viewBox: "0 0 24 24",
    path: "M12 2C7 2 3 7 3 13C3 18 6 22 12 22C18 22 21 18 21 13C21 7 17 2 12 2ZM8.5 10C9.33 10 10 10.67 10 11.5C10 12.33 9.33 13 8.5 13C7.67 13 7 12.33 7 11.5C7 10.67 7.67 10 8.5 10ZM15.5 10C16.33 10 17 10.67 17 11.5C17 12.33 16.33 13 15.5 13C14.67 13 14 12.33 14 11.5C14 10.67 14.67 10 15.5 10Z",
    color: "#6d5e58" // Deep Coffee
  },
  fox: {
    viewBox: "0 0 24 24",
    path: "M12 2C12 2 15 7 17 8C19 9 22 8 22 12C22 17 18 22 12 22C6 22 2 17 2 12C2 8 5 9 7 8C9 7 12 2 12 2ZM8 12C8.55 12 9 12.45 9 13C9 13.55 8.55 14 8 14C7.45 14 7 13.55 7 13C7 12.45 7.45 12 8 12ZM16 12C16.55 12 17 12.45 17 13C17 13.55 16.55 14 16 14C15.45 14 15 13.55 15 13C15 12.45 15.45 12 16 12Z",
    color: "#d68c76" // Nature Clay
  },
  bear: {
    viewBox: "0 0 24 24",
    path: "M12 2C15 2 17 4 19 5C20.5 4 22 5 22 7C22 8 21 9 20 9C20.5 11 21 15 19 18C17 21 15 22 12 22C9 22 7 21 5 18C3 15 3.5 11 4 9C3 9 2 8 2 7C2 5 3.5 4 5 5C7 4 9 2 12 2ZM8 10C8.55 10 9 10.45 9 11C9 11.55 8.55 12 8 12C7.45 12 7 11.55 7 11C7 10.45 7.45 10 8 10ZM16 10C16.55 10 17 10.45 17 11C17 11.55 16.55 12 16 12C15.45 12 15 11.55 15 11C15 10.45 15.45 10 16 10Z",
    color: "#a38472"
  },
  cat: {
    viewBox: "0 0 24 24",
    path: "M12 2C8 2 4 5 4 9C4 11 5 13 6 14C5 15 3 17 3 19C3 20.5 4.5 22 6 22H18C19.5 22 21 20.5 21 19C21 17 19 15 18 14C19 13 20 11 20 9C20 5 16 2 12 2ZM9 8C9.55 8 10 8.45 10 9C10 9.55 9.55 10 9 10C8.45 10 8 9.55 8 9C8 8.45 8.45 8 9 8ZM15 8C15.55 8 16 8.45 16 9C16 9.55 15.55 10 15 10C14.45 10 14 9.55 14 9C14 8.45 14.45 8 15 8Z",
    color: "#bca38f"
  },
  rabbit: {
    viewBox: "0 0 24 24",
    path: "M12 2C10 2 8 4 8 7V9C8 10 7 11 6 11C4 11 2 13 2 16C2 19 4 22 7 22H17C20 22 22 19 22 16C22 13 20 11 18 11C17 11 16 10 16 9V7C16 4 14 2 12 2ZM17 9C17.5 9 18 9.5 18 10C18 10.5 17.5 11 17 11C16.5 11 16 10.5 16 10C16 9.5 16.5 9 17 9ZM7 9C7.5 9 8 9.5 8 10C8 10.5 7.5 11 7 11C6.5 11 6 10.5 6 10C6 9.5 6.5 9 7 9Z",
    color: "#e8d48a"
  },
  dog: {
    viewBox: "0 0 24 24",
    path: "M5 3C3.5 3 2 4.5 2 6V8C2 10 4 11 5 11V18C5 20 6.5 22 9 22H15C17.5 22 19 20 19 18V11C20 11 22 10 22 8V6C22 4.5 20.5 3 19 3H5ZM8 7C8.55 7 9 7.45 9 8C9 8.55 8.55 9 8 9C7.45 9 7 8.55 7 8C7 7.45 7.45 7 8 7ZM16 7C16.55 7 17 7.45 17 8C17 8.55 16.55 9 16 9C15.45 9 15 8.55 15 8C15 7.45 15.45 7 16 7Z",
    color: "#6d5e58"
  },
  squirrel: {
    viewBox: "0 0 24 24",
    path: "M12 4C10 4 8 6 8 8C8 8.5 8.1 9 8.2 9.4C6.8 9.8 6 11 6 12.5C6 14 7.5 15.5 8 17C8.5 18.5 10 20 12 20C14 20 16 18 16 16V12C16 10 14 8 14 6C14 5 13 4 12 4ZM19 12C18 12 17 13 17 14C17 16 18 18 20 18C21 18 22 17 22 15C22 13.5 21 12 19 12Z",
    color: "#d68c76"
  }
};

export const CATEGORIES = [
  { id: 'food', label: '餐飲', icon: 'utensils' },
  { id: 'transport', label: '交通', icon: 'bus' },
  { id: 'housing', label: '住宿', icon: 'home' },
  { id: 'utilities', label: '雜貨', icon: 'shopping-basket' }, // Renamed to Groceries
  { id: 'tickets', label: '票券', icon: 'ticket' }, // Added Tickets
  { id: 'entertainment', label: '娛樂', icon: 'film' }, // Added Entertainment
  { id: 'shopping', label: '購物', icon: 'shopping-bag' }, // Added Shopping
  { id: 'other', label: '其他', icon: 'more-horizontal' },
];

export const PRIMARY_CURRENCIES = ['TWD', 'JPY', 'KRW', 'CNY'];
export const SECONDARY_CURRENCIES = ['USD', 'EUR', 'HKD', 'AUD'];
export const CURRENCIES = [...PRIMARY_CURRENCIES, ...SECONDARY_CURRENCIES];

export const THEMES: Record<ThemeType, { 
  name: string; 
  bg: string; 
  text: string; 
  primary: string; 
  secondary: string; 
  accent: string 
}> = {
  default: {
    name: '山雀 (預設)',
    bg: 'bg-kinari',
    text: 'text-stone-800',
    primary: 'bg-stone-800',
    secondary: 'bg-stone-100',
    accent: 'text-nature-green'
  },
  dark: {
    name: '夜梟 (深色)',
    bg: 'bg-stone-900',
    text: 'text-stone-100',
    primary: 'bg-stone-600',
    secondary: 'bg-stone-800',
    accent: 'text-yellow-400'
  },
  fox: {
    name: '狐狸 (秋色)',
    bg: 'bg-orange-50',
    text: 'text-orange-950',
    primary: 'bg-orange-600',
    secondary: 'bg-orange-100',
    accent: 'text-orange-700'
  },
  whale_shark: {
    name: '鯨鯊 (海洋)',
    bg: 'bg-blue-50',
    text: 'text-slate-900',
    primary: 'bg-slate-600',
    secondary: 'bg-blue-100',
    accent: 'text-blue-600'
  }
};