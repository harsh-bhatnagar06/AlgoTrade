/**
 * src/lib/strategies.js
 * ─────────────────────────────────────────────────────────────
 * CRUD utilities for the `strategies` table in Supabase.
 *
 * Table schema (run the SQL from the deployment guide):
 *   strategies (
 *     id          uuid  PK default gen_random_uuid()
 *     user_id     uuid  FK → auth.users(id)
 *     name        text  NOT NULL
 *     asset       text
 *     timeframe   text
 *     strategy_type text
 *     capital     numeric default 10000
 *     stop_loss   numeric default 2
 *     take_profit numeric default 5
 *     status      text default 'paused'
 *     pnl         numeric default 0
 *     win_rate    numeric default 0
 *     trades      integer default 0
 *     created_at  timestamptz default now()
 *     updated_at  timestamptz default now()
 *   )
 *
 * RLS is enabled — users only see/modify their own rows.
 * ─────────────────────────────────────────────────────────────
 */

const StrategiesDB = (() => {

  const TABLE = 'strategies';

  /**
   * Fetch all strategies belonging to the current user.
   * RLS automatically filters by auth.uid() = user_id.
   *
   * @returns {Promise<{ data: object[] | null, error: string | null }>}
   */
  async function getAllStrategies() {
    return window.DbLib.selectRows(TABLE, {
      orderBy: 'created_at',
      ascending: false,
    });
  }

  /**
   * Fetch a single strategy by ID.
   *
   * @param {string} id - UUID of the strategy
   * @returns {Promise<{ data: object | null, error: string | null }>}
   */
  async function getStrategyById(id) {
    const { data, error } = await window.DbLib.selectRows(TABLE, {
      filters: { id },
      limit: 1,
    });
    return { data: data?.[0] ?? null, error };
  }

  /**
   * Create a new strategy.
   * user_id is set by the database trigger / RLS policy.
   * You MUST be authenticated before calling this.
   *
   * @param {object} strategyData
   * @param {string} strategyData.name
   * @param {string} [strategyData.asset]
   * @param {string} [strategyData.timeframe]
   * @param {string} [strategyData.strategy_type]
   * @param {number} [strategyData.capital]
   * @param {number} [strategyData.stop_loss]
   * @param {number} [strategyData.take_profit]
   * @returns {Promise<{ data: object | null, error: string | null }>}
   */
  async function createStrategy(strategyData) {
    // Attach the current user's ID so RLS can verify ownership
    const user = await window.AuthLib.getUser();
    if (!user) {
      return { data: null, error: 'User not authenticated — cannot create strategy' };
    }

    const row = {
      user_id: user.id,
      name: strategyData.name,
      asset: strategyData.asset ?? null,
      timeframe: strategyData.timeframe ?? null,
      strategy_type: strategyData.strategy_type ?? null,
      capital: strategyData.capital ?? 10000,
      stop_loss: strategyData.stop_loss ?? 2,
      take_profit: strategyData.take_profit ?? 5,
      status: 'paused',
      pnl: 0,
      win_rate: 0,
      trades: 0,
    };

    return window.DbLib.insertRow(TABLE, row);
  }

  /**
   * Update an existing strategy.
   *
   * @param {string} id - UUID of the strategy to update
   * @param {Partial<object>} updates - Fields to update
   * @returns {Promise<{ data: object | null, error: string | null }>}
   */
  async function updateStrategy(id, updates) {
    if (!id) return { data: null, error: 'Strategy ID is required' };
    return window.DbLib.updateRow(TABLE, id, updates);
  }

  /**
   * Delete a strategy permanently.
   *
   * @param {string} id - UUID of the strategy to delete
   * @returns {Promise<{ data: object | null, error: string | null }>}
   */
  async function deleteStrategy(id) {
    if (!id) return { data: null, error: 'Strategy ID is required' };
    return window.DbLib.deleteRow(TABLE, id);
  }

  /**
   * Toggle a strategy between 'running' and 'paused'.
   *
   * @param {string} id
   * @param {string} currentStatus - 'running' or 'paused'
   * @returns {Promise<{ data: object | null, error: string | null }>}
   */
  async function toggleStrategyStatus(id, currentStatus) {
    const newStatus = currentStatus === 'running' ? 'paused' : 'running';
    return updateStrategy(id, { status: newStatus });
  }

  /**
   * Subscribe to realtime changes on the strategies table.
   * Fires callback on INSERT, UPDATE, or DELETE.
   *
   * Prerequisite: Enable Realtime on the strategies table in Supabase dashboard.
   *
   * @param {(payload: object) => void} callback
   * @returns {Promise<() => void>} Call the returned function to unsubscribe.
   */
  async function subscribeToChanges(callback) {
    return window.DbLib.subscribeToTable(TABLE, callback);
  }

  return {
    getAllStrategies,
    getStrategyById,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    toggleStrategyStatus,
    subscribeToChanges,
  };
})();

window.StrategiesDB = StrategiesDB;
