import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are defined
if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL environment variable');
  throw new Error('Supabase configuration error: VITE_SUPABASE_URL is not defined. Please check your .env file.');
}

if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable');
  throw new Error('Supabase configuration error: VITE_SUPABASE_ANON_KEY is not defined. Please check your .env file.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid VITE_SUPABASE_URL format:', supabaseUrl);
  throw new Error(`Supabase configuration error: Invalid URL format for VITE_SUPABASE_URL: ${supabaseUrl}`);
}

// Create Supabase client with improved options for reliability
let supabase;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: { 'x-application-name': 'wikideep' },
    },
    realtime: {
      timeout: 30000
    }
  });
  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  throw new Error(`Failed to initialize Supabase client: ${error.message}`);
}

// Export the client instance
export default supabase;