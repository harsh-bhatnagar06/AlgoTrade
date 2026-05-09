/**
 * Professional Risk Advisory Engine
 * Classifies symbols based on behavior, liquidity, and strength.
 */
class RiskService {
  constructor() {
    this.limits = {
      maxExposurePerTrade: 0.10, // 10% of portfolio
      maxDailyLoss: 0.05,        // 5% total portfolio loss
      highRiskCap: 0.02          // 2% for speculative tiers
    };
  }

  /**
   * Calculates a comprehensive Risk Profile (0-100)
   */
  calculateRiskProfile(symbol, price, history = []) {
    // 1. Calculate Volatility (Realized)
    const volatility = this._calculateVolatility(history);
    
    // 2. Determine Asset Class (Mocked for Demo symbols)
    const assetInfo = this._getAssetMetadata(symbol);
    
    // 3. Calculate Final Risk Score
    let score = (volatility * 10) + (assetInfo.riskOffset);
    score = Math.min(Math.max(score, 5), 95); // Bound between 5 and 95

    // 4. Assign Tier and Style
    let tier, style, color, warnings = [];
    if (score < 30) {
      tier = 'LOW RISK';
      style = 'Long-term / Core Portfolio';
      color = '#22d3a5'; // Emerald
    } else if (score < 65) {
      tier = 'MEDIUM RISK';
      style = 'Swing / Growth Segment';
      color = '#f5c842'; // Amber
    } else {
      tier = 'HIGH RISK';
      style = 'Speculative / Intraday';
      color = '#f5475c'; // Rose
      warnings.push("High volatility detected. News-driven price action possible.");
    }

    if (assetInfo.liquidity === 'Moderate') {
      warnings.push("Moderate liquidity: Use limit orders only.");
    }

    return {
      score: Math.round(score),
      tier,
      style,
      color,
      factors: {
        volatility: volatility.toFixed(2) + '%',
        marketCap: assetInfo.mCap,
        liquidity: assetInfo.liquidity
      },
      warnings
    };
  }

  _calculateVolatility(history) {
    if (!history || history.length < 2) return 2.5; // Default moderate
    const returns = [];
    for (let i = 1; i < history.length; i++) {
      returns.push((history[i] - history[i-1]) / history[i-1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100; // Percentage volatility
  }

  _getAssetMetadata(symbol) {
    const largeCaps = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'RELIANCE', 'TCS'];
    const midCaps = ['TSLA', 'AMD', 'WIPRO', 'INFY'];
    
    if (largeCaps.includes(symbol)) return { mCap: 'Large-Cap', liquidity: 'High', riskOffset: 10 };
    if (midCaps.includes(symbol)) return { mCap: 'Mid-Cap', liquidity: 'High', riskOffset: 40 };
    return { mCap: 'Small-Cap / Speculative', liquidity: 'Moderate', riskOffset: 70 };
  }

  validateOrder(order, portfolio) {
    const profile = this.calculateRiskProfile(order.symbol, order.price);
    const exposure = (order.price * order.qty) / (portfolio.total_value || 250000);

    if (profile.tier === 'HIGH RISK' && exposure > this.limits.highRiskCap) {
      return { approved: false, error: "Speculative position exceeds 2% exposure limit." };
    }
    if (exposure > this.limits.maxExposurePerTrade) {
      return { approved: false, error: "Position exceeds maximum trade exposure (10%)." };
    }

    return { approved: true, riskProfile: profile };
  }
}

module.exports = new RiskService();
