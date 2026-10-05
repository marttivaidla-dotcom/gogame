import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Rakenduse tabelid on eraldi skeemis, et jagada Supabase'i projekti teiste rakendustega
export const DB_SCHEMA = 'lauamangud'

export const isSupabaseConfigured = Boolean(url && key)

export const supabase = isSupabaseConfigured ? createClient(url, key, { db: { schema: DB_SCHEMA } }) : null
