/**
 * src/lib/auth.js
 * ─────────────────────────────────────────────────────────────
 * Authentication helpers for AlgoForge.
 *
 * Supports:
 *  - Google OAuth (Sign in / Sign up)
 *  - Session retrieval
 *  - Logout
 *  - Auth state change listener
 *
 * All functions are async-safe and handle errors gracefully.
 * ─────────────────────────────────────────────────────────────
 */

const AuthLib = (() => {

  /**
   * Signs the user in with Google OAuth.
   * Redirects to Supabase → Google → back to the app.
   *
   * Supabase Dashboard requirement:
   *   Authentication → Providers → Google → Enable
   *   Set "Redirect URL" to your Firebase Hosting domain.
   *
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function signInWithGoogle() {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return { success: false, error: 'Supabase client not ready' };

      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect back to the app after Google login
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline', // Needed for refresh tokens
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[Auth] Google sign-in failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Signs the current user out and clears the session.
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function signOut() {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return { success: false, error: 'Supabase client not ready' };

      const { error } = await client.auth.signOut();
      if (error) throw error;

      console.info('[Auth] User signed out');
      return { success: true };
    } catch (err) {
      console.error('[Auth] Sign-out failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Returns the current active session (or null if not authenticated).
   * @returns {Promise<import('@supabase/supabase-js').Session | null>}
   */
  async function getSession() {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return null;

      const { data: { session }, error } = await client.auth.getSession();
      if (error) throw error;
      return session;
    } catch (err) {
      console.error('[Auth] getSession failed:', err.message);
      return null;
    }
  }

  /**
   * Returns the currently logged-in user object, or null.
   * @returns {Promise<import('@supabase/supabase-js').User | null>}
   */
  async function getUser() {
    const session = await getSession();
    return session?.user ?? null;
  }

  /**
   * Subscribe to authentication state changes.
   * Callback receives { event, session } — event is 'SIGNED_IN', 'SIGNED_OUT', etc.
   *
   * @param {(event: string, session: object | null) => void} callback
   * @returns {Promise<{ unsubscribe: () => void } | null>}
   *
   * Usage:
   *   const sub = await AuthLib.onAuthStateChange((event, session) => {
   *     if (event === 'SIGNED_IN') updateUI(session.user);
   *   });
   *   // Later: sub.unsubscribe();
   */
  async function onAuthStateChange(callback) {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return null;

      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        console.info(`[Auth] State change: ${event}`);
        callback(event, session);
      });

      return { unsubscribe: () => subscription.unsubscribe() };
    } catch (err) {
      console.error('[Auth] onAuthStateChange setup failed:', err.message);
      return null;
    }
  }

  /**
   * Quick helper: returns true if the user is currently logged in.
   * @returns {Promise<boolean>}
   */
  async function isAuthenticated() {
    const session = await getSession();
    return session !== null;
  }

  /**
   * Signs the user in with Email and Password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function signInWithEmail(email, password) {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return { success: false, error: 'Supabase client not ready' };

      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[Auth] Email sign-in failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Registers a new user with Email and Password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function signUpWithEmail(email, password) {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return { success: false, error: 'Supabase client not ready' };

      const { error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[Auth] Email sign-up failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  return {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    getSession,
    getUser,
    onAuthStateChange,
    isAuthenticated,
  };
})();

window.AuthLib = AuthLib;
