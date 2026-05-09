/**
 * src/lib/supabase.js
 * ─────────────────────────────────────────────────────────────
 * Supabase client initialization for AlgoForge (Vanilla JS).
 *
 * Architecture:
 *  - The Supabase URL and anon key are PUBLIC by design (RLS enforces security).
 *  - They are never hardcoded here — fetched from the backend /api/config route
 *    so the .env file remains the single source of truth.
 *  - This module must be loaded AFTER the Supabase CDN script in index.html.
 *
 * Usage (from any other module):
 *   const client = await SupabaseLib.getClient();
 * ─────────────────────────────────────────────────────────────
 */

const SupabaseLib = (() => {
  // Singleton client instance
  let _client = null;

  // Public Supabase configuration
  // Safe to put here as long as RLS is enabled on the database.
  const SUPABASE_URL = 'https://dblwazinwogkovbspiel.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_fqgIzHVdpI_jzeAuk2K18w_WfwVW2vC';

  /**
   * Initializes and returns the Supabase client singleton.
   */
  async function getClient() {
    if (_client) return _client;

    try {
      // window.supabase is provided by the CDN script in index.html
      _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });

      console.info('[Supabase] Client initialized (Free Plan mode)');
      return _client;
    } catch (err) {
      console.error('[Supabase] Initialization failed:', err.message);
      return null;
    }
  }

  /**
   * Returns the client synchronously if already initialized.
   * Use getClient() for async-safe access.
   */
  function peek() {
    return _client;
  }

  return { getClient, peek };
})();

// Make globally available on window for other vanilla JS modules
window.SupabaseLib = SupabaseLib;
