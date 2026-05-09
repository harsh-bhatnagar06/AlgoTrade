/**
 * Outcome Service — Experience Outcome Tracker
 * Updates historical memories with actual market results.
 */

const supabase = require('./db');

class OutcomeService {
  /**
   * Updates an experience with realized outcomes.
   * Typically called by a worker or when historical data becomes available.
   */
  async recordOutcome(memoryId, outcomes) {
    const { return1d, return3d, return7d, maxDrawdown } = outcomes;
    
    // Determine success (e.g., if 3-day return > 2%)
    const isSuccess = return3d > 2.0;

    const { error } = await supabase
      .from('memory_outcomes')
      .upsert([
        {
          memory_id: memoryId,
          return_1d: return1d,
          return_3d: return3d,
          return_7d: return7d,
          max_drawdown: maxDrawdown,
          is_success: isSuccess
        }
      ]);

    if (error) {
      console.error("Error recording outcome:", error);
      throw new Error("Failed to record outcome");
    }

    return { memory_id: memoryId, status: "Outcome Recorded", success: isSuccess };
  }

  /**
   * Finds memories that are missing outcomes and need updating.
   */
  async getPendingOutcomes() {
    // Supabase JS doesn't support complex left joins with 'is null' perfectly in a single call easily, 
    // but we can query memories and filter out those that don't have outcomes.
    // For a cleaner approach, we could use a Supabase RPC or view, but for now we fetch recent memories without outcomes.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: memories, error } = await supabase
      .from('market_memories')
      .select('*, memory_outcomes(memory_id)')
      .lt('timestamp', oneDayAgo);

    if (error) return [];

    return memories.filter(m => !m.memory_outcomes || m.memory_outcomes.length === 0);
  }
}

module.exports = new OutcomeService();
