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

// Add connection retry logic
async function createSupabaseClientWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = createClient(supabaseUrl, supabaseAnonKey, {
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
      
      // Test the connection
      const { error } = await client.from('users').select('count', { count: 'exact', head: true });
      
      if (error) {
        if (attempt === maxRetries) {
          throw new Error(`Supabase connection failed after ${maxRetries} attempts: ${error.message}`);
        }
        console.warn(`Supabase connection attempt ${attempt} failed:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }
      
      console.log(`Supabase client created successfully on attempt ${attempt}`);
      return client;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Supabase client creation attempt ${attempt} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

try {
  supabase = await createSupabaseClientWithRetry();
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  
  // Create a fallback client that will show helpful error messages
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: { 'x-application-name': 'wikideep' },
    }
  });
  
  // Show user-friendly error message
  if (typeof window !== 'undefined') {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #dc3545;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      z-index: 10000;
      max-width: 600px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    errorDiv.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 10px;">⚠️ Database Connection Issue</div>
      <div style="font-size: 14px;">
        Your Supabase project might be paused. 
        <a href="https://supabase.com/dashboard" target="_blank" style="color: #fff; text-decoration: underline;">
          Visit your dashboard
        </a> to wake it up.
      </div>
    `;
    
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 10000);
    });
  }
}

// Export the client instance
export default supabase;