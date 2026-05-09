/**
 * Regime Detection Service — Classifies the Market Environment
 * Detects trends, volatility clusters, and overall market sentiment.
 */

class RegimeDetectionService {
  constructor() {
    this.currentRegime = {
      type: 'UNKNOWN',
      volatility: 'STABLE',
      sentiment: 0.5,
      liquidity: 'NORMAL',
      confidence: 0.0
    };
  }

  /**
   * Analyzes market data to detect the current regime.
   */
  async detectRegime(marketData) {
    // Example Logic (In production, this would use AI Reasoning Models)
    const priceChange = marketData.index_change || 0;
    const volIndex = marketData.vol_index || 0.5;

    let type = 'SIDEWAYS_STATIONARY';
    if (priceChange > 1.5 && volIndex < 0.6) type = 'BULLISH_EXPANSION';
    else if (priceChange < -1.5 && volIndex > 0.8) type = 'PANIC_VOLATILITY';
    else if (priceChange < -1.0) type = 'BEARISH_TREND';
    else if (volIndex < 0.3) type = 'LOW_VOL_ACCUMULATION';

    this.currentRegime = {
      type,
      volatility: volIndex > 0.7 ? 'HIGH' : (volIndex < 0.3 ? 'LOW' : 'NORMAL'),
      sentiment: priceChange > 0 ? 0.7 : 0.3,
      liquidity: volIndex > 0.9 ? 'THIN' : 'DEEP',
      confidence: 0.85,
      timestamp: new Date().toISOString()
    };

    return this.currentRegime;
  }

  getCurrentRegime() {
    return this.currentRegime;
  }

  /**
   * Returns risk multiplier based on regime.
   */
  getRiskMultiplier() {
    switch (this.currentRegime.type) {
      case 'PANIC_VOLATILITY': return 0.25;
      case 'BEARISH_TREND': return 0.5;
      case 'BULLISH_EXPANSION': return 1.25;
      default: return 1.0;
    }
  }
}

module.exports = new RegimeDetectionService();
