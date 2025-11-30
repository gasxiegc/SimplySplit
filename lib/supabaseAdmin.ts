import { createClient } from '@supabase/supabase-js'

// NOTE: This file should only be used in a server-side environment (e.g. API routes, Edge Functions).
// The SUPABASE_SERVICE_ROLE_KEY is sensitive and is NOT exposed to the client bundle by Vite config.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRole) {
    console.warn('Supabase Admin keys are missing.');
}

// Fallback to prevent initialization errors
const url = supabaseUrl || 'https://placeholder.supabase.co'
const key = serviceRole || 'placeholder-key'

export const supabaseAdmin = createClient(url, key)