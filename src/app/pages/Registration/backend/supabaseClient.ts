import { createClient } from '@supabase/supabase-js'

// Get these from your Supabase project settings -> API
const supabaseUrl = 'https://jbwgefxvczlimjemgslt.supabase.co'
const supabaseAnonKey = 'sb_publishable_Bxj3qsK6iictW40ISesQjw_NYAMLqam'

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)