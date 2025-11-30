
import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables in different environments
const getEnvVar = (key: string) => {
  try {
    // Check import.meta.env (Vite)
    const meta = import.meta as any;
    if (meta && meta.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  try {
    // Check process.env (Node/Compat)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  return undefined;
};

// Use provided credentials as default fallback if env vars are missing
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://vyfwvjtsmlvduqmphoxj.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5Znd2anRzbWx2ZHVxbXBob3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Njk1MjgsImV4cCI6MjA4MDA0NTUyOH0.b3RrFIq7xmVIuAURiRSjZ-BjC0apvAiTij1Cs2GOaDg';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase connection details are missing.');
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);
