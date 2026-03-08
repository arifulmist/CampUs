import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function callEdgeFunction(functionName: string, body: any) {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });

    if (error) {
      console.error("Edge function error:", error);
      return { error: error.message };
    }

    return data;
  } catch (error) {
    console.error("Error calling edge function:", error);
    return { error: "Failed to call function" };
  }
}
