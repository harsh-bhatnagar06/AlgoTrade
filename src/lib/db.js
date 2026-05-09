/**
 * src/lib/db.js
 * ─────────────────────────────────────────────────────────────
 * Generic database access utilities for AlgoForge.
 *
 * These are low-level helpers used by feature-specific modules
 * (e.g., strategies.js). They handle errors consistently and
 * return a standard { data, error } shape.
 *
 * Row Level Security (RLS) is enforced by Supabase — users can
 * only access their own rows based on auth.uid().
 *
 * Future: realtime subscriptions can be added via subscribeToTable().
 * ─────────────────────────────────────────────────────────────
 */

const DbLib = (() => {

  /**
   * Standard response shape returned by all DB helpers.
   * @typedef {{ data: any | null, error: string | null }} DbResult
   */

  /**
   * SELECT rows from a table with optional filters.
   *
   * @param {string} table - Table name (e.g., 'strategies')
   * @param {object} [options]
   * @param {string} [options.select='*'] - Columns to select
   * @param {Record<string, any>} [options.filters] - Equality filters { column: value }
   * @param {string} [options.orderBy] - Column to sort by
   * @param {boolean} [options.ascending=false] - Sort direction
   * @param {number} [options.limit] - Max rows to return
   * @returns {Promise<DbResult>}
   */
  async function selectRows(table, options = {}) {
    const {
      select = '*',
      filters = {},
      orderBy = 'created_at',
      ascending = false,
      limit,
    } = options;

    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return { data: null, error: 'Supabase client not ready' };

      let query = client.from(table).select(select);

      // Apply equality filters
      for (const [col, val] of Object.entries(filters)) {
        query = query.eq(col, val);
      }

      // Ordering
      if (orderBy) query = query.order(orderBy, { ascending });

      // Row limit
      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error(`[DB] select from ${table} failed:`, err.message);
      return { data: null, error: err.message };
    }
  }

  /**
   * INSERT a single row into a table.
   *
   * @param {string} table
   * @param {Record<string, any>} row - Row data to insert
   * @returns {Promise<DbResult>}
   */
  async function insertRow(table, row) {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return { data: null, error: 'Supabase client not ready' };

      const { data, error } = await client
        .from(table)
        .insert(row)
        .select()  // Return the inserted row
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error(`[DB] insert into ${table} failed:`, err.message);
      return { data: null, error: err.message };
    }
  }

  /**
   * UPDATE rows matching a filter in a table.
   *
   * @param {string} table
   * @param {string} id - Row UUID to update
   * @param {Record<string, any>} updates - Fields to update
   * @returns {Promise<DbResult>}
   */
  async function updateRow(table, id, updates) {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return { data: null, error: 'Supabase client not ready' };

      const { data, error } = await client
        .from(table)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error(`[DB] update in ${table} failed:`, err.message);
      return { data: null, error: err.message };
    }
  }

  /**
   * DELETE a row by ID.
   *
   * @param {string} table
   * @param {string} id - Row UUID to delete
   * @returns {Promise<DbResult>}
   */
  async function deleteRow(table, id) {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return { data: null, error: 'Supabase client not ready' };

      const { error } = await client
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: { deleted: id }, error: null };
    } catch (err) {
      console.error(`[DB] delete from ${table} failed:`, err.message);
      return { data: null, error: err.message };
    }
  }

  /**
   * REALTIME — Subscribe to table changes.
   * Returns an unsubscribe function.
   *
   * Future use: call this once Supabase Realtime is enabled in the dashboard.
   *
   * @param {string} table
   * @param {(payload: object) => void} callback
   * @returns {Promise<() => void>} unsubscribe function
   */
  async function subscribeToTable(table, callback) {
    try {
      const client = await window.SupabaseLib.getClient();
      if (!client) return () => {};

      const channel = client
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();

      console.info(`[DB] Subscribed to realtime changes on ${table}`);
      return () => client.removeChannel(channel);
    } catch (err) {
      console.error(`[DB] Realtime subscription to ${table} failed:`, err.message);
      return () => {};
    }
  }

  return {
    selectRows,
    insertRow,
    updateRow,
    deleteRow,
    subscribeToTable,
  };
})();

window.DbLib = DbLib;
