import { createClient } from '@supabase/supabase-js'

// Get these from your Supabase project settings -> API
const supabaseUrl = 'https://jbwgefxvczlimjemgslt.supabase.co'
const supabaseAnonKey = 'sb_publishable_Bxj3qsK6iictW40ISesQjw_NYAMLqam'

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export async function callEdgeFunction(functionName: string, body: any) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(body)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error calling edge function:', error);
    return { error: 'Failed to call function' };
  }
}