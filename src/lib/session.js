/**
 * src/lib/session.js
 * ─────────────────────────────────────────────────────────────
 * Session management and auth-state bootstrapping for AlgoForge.
 *
 * Call SessionLib.init() once at app startup (in app.js or init()).
 * It will:
 *   1. Initialize the Supabase client
 *   2. Restore any persisted session from localStorage
 *   3. Set up an auth state listener to keep the UI in sync
 *   4. Expose the current user globally as window.currentUser
 *
 * Future: add trading execution permission checks here.
 * ─────────────────────────────────────────────────────────────
 */

const SessionLib = (() => {

  // Auth state subscription handle — used to unsubscribe if needed
  let _authSubscription = null;

  /**
   * Initializes the session layer at app boot.
   * Safe to call multiple times (idempotent).
   *
   * @param {object} [options]
   * @param {(user: object | null) => void} [options.onSignIn]   - Called when user signs in
   * @param {() => void}                    [options.onSignOut]  - Called when user signs out
   * @returns {Promise<object | null>} The current user, or null if not logged in
   */
  async function init(options = {}) {
    const { onSignIn, onSignOut } = options;

    // 1. Boot the Supabase client
    const client = await window.SupabaseLib.getClient();
    if (!client) {
      console.warn('[Session] Supabase not available — running in offline mode');
      return null;
    }

    // 2. Restore existing session (from localStorage persistence)
    const session = await window.AuthLib.getSession();
    const currentUser = session?.user ?? null;

    // Expose globally so other modules can check auth status
    window.currentUser = currentUser;

    if (currentUser) {
      console.info('[Session] Restored session for:', currentUser.email);
      onSignIn?.(currentUser);
    }

    // 3. Listen for future auth state changes
    _authSubscription = await window.AuthLib.onAuthStateChange((event, newSession) => {
      const user = newSession?.user ?? null;
      window.currentUser = user;

      if (event === 'SIGNED_IN') {
        console.info('[Session] User signed in:', user?.email);
        onSignIn?.(user);
      } else if (event === 'SIGNED_OUT') {
        console.info('[Session] User signed out');
        onSignOut?.();
      } else if (event === 'TOKEN_REFRESHED') {
        console.info('[Session] Access token refreshed');
      }
    });

    return currentUser;
  }

  /**
   * Tears down the auth listener — call on page unload if needed.
   */
  function destroy() {
    _authSubscription?.unsubscribe();
    _authSubscription = null;
    window.currentUser = null;
  }

  /**
   * Returns the current user synchronously from the global cache.
   * Use AuthLib.getUser() for an async-accurate version.
   * @returns {object | null}
   */
  function getCurrentUser() {
    return window.currentUser ?? null;
  }

  /**
   * Quick auth guard — use before any privileged operation.
   * @returns {boolean}
   */
  function isLoggedIn() {
    return window.currentUser !== null && window.currentUser !== undefined;
  }

  return {
    init,
    destroy,
    getCurrentUser,
    isLoggedIn,
  };
})();

window.SessionLib = SessionLib;
