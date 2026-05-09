/**
 * Outcome Service — Experience Outcome Tracker
 * Updates historical memories with actual market results.
 */

const db = require('../db');

class OutcomeService {
  constructor() {
    this.db = db;
  }

  /**
   * Updates an experience with realized outcomes.
   * Typically called by a worker or when historical data becomes available.
   */
  recordOutcome(memoryId, outcomes) {
    const { return1d, return3d, return7d, maxDrawdown } = outcomes;
    
    // Determine success (e.g., if 3-day return > 2%)
    const isSuccess = return3d > 2.0;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_outcomes 
      (memory_id, return_1d, return_3d, return_7d, max_drawdown, is_success, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(memoryId, return1d, return3d, return7d, maxDrawdown, isSuccess ? 1 : 0);

    return { memory_id: memoryId, status: "Outcome Recorded", success: isSuccess };
  }

  /**
   * Finds memories that are missing outcomes and need updating.
   */
  getPendingOutcomes() {
    return this.db.prepare(`
      SELECT m.* FROM market_memories m
      LEFT JOIN memory_outcomes o ON m.id = o.memory_id
      WHERE o.memory_id IS NULL
      AND m.timestamp < datetime('now', '-1 day')
    `).all();
  }
}

module.exports = new OutcomeService();
