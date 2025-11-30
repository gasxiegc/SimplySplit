import { createClient } from '@supabase/supabase-js'

// 在 Vite 專案中，環境變數需透過 import.meta.env 存取
// 我們加入預設值 (fallback)，避免環境變數未載入時導致應用程式直接崩潰 (White Screen)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);