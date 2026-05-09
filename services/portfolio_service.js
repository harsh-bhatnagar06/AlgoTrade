/**
 * Portfolio Service — Position & PnL Aggregation
 * Syncs local state with broker data and calculates real-time performance.
 */

const memoryService = require('./memory_service');

class PortfolioService {
  constructor() {
    this.currentPortfolio = {
      total_value: 250000,
      available_margin: 250000,
      total_exposure: 0,
      unrealized_pnl: 0,
      realized_pnl: 0
    };
  }

  /**
   * Syncs active positions from the database.
   */
  async getLocalPortfolio() {
    const positions = memoryService.db.prepare('SELECT * FROM active_positions').all();
    this.currentPortfolio.total_exposure = positions.reduce((acc, pos) => acc + (pos.qty * pos.entry_price), 0);
    
    return {
      stats: this.currentPortfolio,
      positions: positions
    };
  }

  /**
   * Saves a snapshot of the portfolio for historical tracking.
   */
  async createSnapshot(data) {
    const stmt = memoryService.db.prepare(`
      INSERT INTO portfolio_snapshots 
      (total_value, available_margin, unrealized_pnl, realized_pnl, exposure)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      data.total_value,
      data.available_margin,
      data.unrealized_pnl,
      data.realized_pnl,
      data.exposure
    );

    this.currentPortfolio = data;
    return { status: "Snapshot Created" };
  }

  /**
   * Fetches the latest 30 snapshots for chart rendering.
   */
  async getPerformanceHistory() {
    return memoryService.db.prepare('SELECT * FROM portfolio_snapshots ORDER BY timestamp DESC LIMIT 30').all();
  }

  /**
   * Logs a risk event for the UI monitor.
   */
  async getRiskLogs() {
    return memoryService.db.prepare('SELECT * FROM risk_events ORDER BY timestamp DESC LIMIT 20').all();
  }
}

module.exports = new PortfolioService();
