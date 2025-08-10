import supabase from './supabaseClient.js';

/**
 * Enhanced connection test with detailed error reporting
 */
export async function testSupabaseConnection() {
  const results = {
    success: false,
    errors: [],
    details: {},
    suggestions: []
  };

  try {
    console.log('Testing Supabase connection to:', import.meta.env.VITE_SUPABASE_URL);
    
    // Test 1: Basic connectivity
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      results.details.httpStatus = response.status;
      results.details.latency = Math.round(performance.now() - startTime);
      
      if (!response.ok) {
        results.errors.push({
          type: 'HTTP_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
          details: { status: response.status, statusText: response.statusText }
        });
        
        if (response.status === 404) {
          results.suggestions.push('Your Supabase project URL might be incorrect or the project may have been deleted');
        } else if (response.status === 401) {
          results.suggestions.push('Check your Supabase API key - it might be invalid or expired');
        } else if (response.status === 403) {
          results.suggestions.push('API key permissions issue - verify your anon key has the correct permissions');
        }
      } else {
        results.success = true;
      }
    } catch (fetchError) {
      results.errors.push({
        type: 'NETWORK_ERROR',
        message: fetchError.message,
        details: fetchError
      });
      
      if (fetchError.message.includes('Failed to fetch')) {
        results.suggestions.push('Network connectivity issue - check your internet connection and firewall settings');
        results.suggestions.push('Your Supabase project might be paused (free tier projects pause after 1 week of inactivity)');
        results.suggestions.push('Try visiting your Supabase dashboard to wake up the project: https://supabase.com/dashboard');
      }
    }

    // Test 2: Database table access
    if (results.success) {
      try {
        const { error: tableError } = await supabase
          .from('users')
          .select('count', { count: 'exact', head: true });
        
        if (tableError) {
          results.errors.push({
            type: 'DATABASE_ERROR',
            message: tableError.message,
            details: tableError
          });
          
          if (tableError.code === '42P01') {
            results.suggestions.push('Database tables are missing - run your migrations');
          } else if (tableError.code === '42501') {
            results.suggestions.push('Permission denied - check your RLS policies and API key permissions');
          }
        }
      } catch (dbError) {
        results.errors.push({
          type: 'DATABASE_ACCESS_ERROR',
          message: dbError.message,
          details: dbError
        });
      }
    }

    return results;
  } catch (error) {
    results.errors.push({
      type: 'CRITICAL_ERROR',
      message: error.message,
      details: error
    });
    return results;
  }
}

/**
 * Comprehensive Supabase connection checker
 * Tests various aspects of the Supabase connection and returns detailed diagnostics
 */
export async function checkSupabaseHealth() {
  const results = {
    connection: false,
    auth: false,
    database: false,
    storage: false,
    details: {},
    errors: []
  };

  try {
    // 1. Basic connection test
    console.log("Testing Supabase connection...");
    const start = performance.now();
    
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      
      results.connection = true;
      results.details.connectionLatency = Math.round(performance.now() - start);
      results.details.connectionMessage = `Connection successful (${results.details.connectionLatency}ms)`;
    } catch (error) {
      results.errors.push({
        component: 'connection',
        message: error.message,
        details: error
      });
    }

    // 2. Auth service check
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError) throw authError;
      
      results.auth = true;
      results.details.authSession = authData.session ? 'Active session found' : 'No active session';
    } catch (error) {
      results.errors.push({
        component: 'auth',
        message: error.message,
        details: error
      });
    }

    // 3. Database query test
    try {
      const tables = ['users', 'archive_posts', 'collab_posts', 'forum_posts', 'user_favorites', 'user_follows', 'user_notifications'];
      results.details.tables = {};
      let allTablesAccessible = true;
      
      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
            
          if (error) {
            results.details.tables[table] = { accessible: false, error: error.message };
            allTablesAccessible = false;
          } else {
            results.details.tables[table] = { accessible: true, count };
          }
        } catch (tableError) {
          // Handle individual table errors without failing the whole test
          results.details.tables[table] = { accessible: false, error: tableError.message };
          allTablesAccessible = false;
        }
      }
      
      results.database = allTablesAccessible;
    } catch (error) {
      results.errors.push({
        component: 'database',
        message: error.message,
        details: error
      });
    }

    // 4. Storage bucket check
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) throw bucketsError;
      
      results.storage = true;
      results.details.storageBuckets = buckets.map(b => b.name);
    } catch (error) {
      results.errors.push({
        component: 'storage',
        message: error.message,
        details: error
      });
    }

    // Overall health assessment
    results.healthy = results.connection && results.database;
    results.status = results.healthy ? 'HEALTHY' : 'ISSUES DETECTED';

    return results;

  } catch (error) {
    console.error("Critical error during Supabase health check:", error);
    results.status = 'CRITICAL ERROR';
    results.errors.push({
      component: 'overall',
      message: error.message,
      details: error
    });
    return results;
  }
}

/**
 * Tests a specific database table for access and data integrity
 */
export async function testDatabaseTable(tableName, sampleQuery = {}) {
  try {
    console.log(`Testing table: ${tableName}`);
    
    // Check if table exists and is accessible
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      return {
        success: false,
        table: tableName,
        error: countError.message,
        details: countError
      };
    }
    
    // Try a simple data query
    const { data, error: queryError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (queryError) {
      return {
        success: false,
        table: tableName,
        error: queryError.message,
        details: queryError
      };
    }
    
    return {
      success: true,
      table: tableName,
      count,
      sampleData: data.length > 0 ? 'Data available' : 'No data found',
      message: `Table '${tableName}' is accessible with ${count} records`
    };
    
  } catch (error) {
    return {
      success: false,
      table: tableName,
      error: error.message,
      details: error
    };
  }
}

/**
 * Gets technical details about the Supabase configuration
 */
export function getSupabaseConfig() {
  // Only return non-sensitive information
  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    anon_key_present: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    anon_key_length: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
  };
}

/**
 * Simple connection test that can be used in app initialization
 */
export async function quickConnectionTest() {
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.error("Supabase connection failed:", error);
    return false;
  }
}

/**
 * Tests the WebSocket connection to Supabase Realtime
 */
export async function testRealtimeConnection() {
  return new Promise((resolve) => {
    try {
      // Set up a timeout to consider the test failed after 5 seconds
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Connection timeout' });
      }, 5000);
      
      const channel = supabase.channel('realtime-test', {
        config: {
          broadcast: { self: true }
        }
      });
      
      // Listen for connection status
      channel
        .on('system', { event: 'presence_state' }, () => {
          clearTimeout(timeout);
          channel.unsubscribe();
          resolve({ success: true, latency: null });
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            // If we get an error status
            if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
              clearTimeout(timeout);
              resolve({ success: false, error: `Connection status: ${status}` });
            }
          }
        });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}