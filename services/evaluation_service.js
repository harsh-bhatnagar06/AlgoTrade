/**
 * Evaluation Service — Strategy Performance Engine
 * Calculates advanced trading metrics and segmented performance.
 */

class EvaluationService {
  /**
   * Calculates performance metrics for a list of trades.
   */
  evaluateStrategy(trades, initialCapital = 100000) {
    if (!trades || trades.length === 0) return this.getEmptyMetrics();

    let balance = initialCapital;
    const equityCurve = [balance];
    let wins = 0;
    let totalPnl = 0;
    let maxDrawdown = 0;
    let peak = initialCapital;

    trades.forEach(trade => {
      const pnl = trade.pnl || 0;
      totalPnl += pnl;
      balance += pnl;
      equityCurve.push(balance);

      if (pnl > 0) wins++;
      
      if (balance > peak) peak = balance;
      const dd = (peak - balance) / peak * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    const winRate = (wins / trades.length) * 100;
    const totalReturn = (totalPnl / initialCapital) * 100;
    
    // Simplified Sharpe Ratio (assuming risk-free rate = 0)
    const returns = trades.map(t => t.pnl / initialCapital);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.map(r => Math.pow(r - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length);
    const sharpe = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualized

    return {
      total_return: totalReturn.toFixed(2) + '%',
      win_rate: winRate.toFixed(1) + '%',
      max_drawdown: maxDrawdown.toFixed(2) + '%',
      sharpe_ratio: sharpe.toFixed(2),
      profit_factor: this.calculateProfitFactor(trades),
      total_trades: trades.length,
      expectancy: (avgReturn * 100).toFixed(2) + '%'
    };
  }

  calculateProfitFactor(trades) {
    const grossProfits = trades.filter(t => t.pnl > 0).reduce((a, b) => a + b.pnl, 0);
    const grossLosses = Math.abs(trades.filter(t => t.pnl < 0).reduce((a, b) => a + b.pnl, 0));
    return grossLosses === 0 ? grossProfits.toFixed(2) : (grossProfits / grossLosses).toFixed(2);
  }

  getEmptyMetrics() {
    return {
      total_return: '0.00%',
      win_rate: '0.0%',
      max_drawdown: '0.00%',
      sharpe_ratio: '0.00',
      profit_factor: '0.00',
      total_trades: 0,
      expectancy: '0.00%'
    };
  }
}

module.exports = new EvaluationService();
