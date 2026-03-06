import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function callEdgeFunction(functionName: string, body: any) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(body)
    })

    return await response.json()
  } catch (error) {
    console.error('Error calling edge function:', error)
    return { error: 'Failed to call function' }
  }
}