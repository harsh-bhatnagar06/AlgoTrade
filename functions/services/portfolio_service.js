/**
 * Portfolio Service — Position & PnL Aggregation
 * Syncs local state with broker data and calculates real-time performance.
 */

const supabase = require('./db');

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
    const { data: positions, error } = await supabase
      .from('active_positions')
      .select('*');

    if (error) {
      console.error("Error fetching active positions:", error);
      return { stats: this.currentPortfolio, positions: [] };
    }

    this.currentPortfolio.total_exposure = (positions || []).reduce((acc, pos) => acc + (pos.qty * pos.entry_price), 0);
    
    return {
      stats: this.currentPortfolio,
      positions: positions || []
    };
  }

  /**
   * Saves a snapshot of the portfolio for historical tracking.
   */
  async createSnapshot(data) {
    const { error } = await supabase
      .from('portfolio_snapshots')
      .insert([
        {
          total_value: data.total_value,
          available_margin: data.available_margin,
          unrealized_pnl: data.unrealized_pnl,
          realized_pnl: data.realized_pnl,
          exposure: data.exposure
        }
      ]);

    if (error) {
      console.error("Error creating portfolio snapshot:", error);
      throw new Error("Failed to create snapshot");
    }

    this.currentPortfolio = data;
    return { status: "Snapshot Created" };
  }

  /**
   * Fetches the latest 30 snapshots for chart rendering.
   */
  async getPerformanceHistory() {
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(30);

    return data || [];
  }

  /**
   * Logs a risk event for the UI monitor.
   */
  async getRiskLogs() {
    const { data, error } = await supabase
      .from('risk_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);

    return data || [];
  }
}

module.exports = new PortfolioService();
