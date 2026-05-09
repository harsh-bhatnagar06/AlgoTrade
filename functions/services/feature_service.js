/**
 * Feature Service — Semantic Feature Extraction
 * Converts raw market data into meaningful semantic labels.
 */

class FeatureService {
  /**
   * Transforms raw data into a semantic state object.
   * @param {Object} rawData - Price, RSI, Volume, etc.
   */
  extractSemanticFeatures(rawData) {
    const { price, rsi, vwap, volume, change } = rawData;

    return {
      trend: this.detectTrend(change, rsi),
      volatility: this.detectVolatility(rawData),
      momentum: this.detectMomentum(rsi),
      vwap_relation: this.detectVWAPRelation(price, vwap),
      price_structure: this.detectPriceStructure(rawData),
      regime: this.detectRegime(change, rsi, volume)
    };
  }

  detectTrend(change, rsi) {
    if (change > 2 && rsi > 60) return "bullish_expansion";
    if (change > 0 && rsi > 50) return "bullish_steady";
    if (change < -2 && rsi < 40) return "bearish_capitulation";
    if (change < 0 && rsi < 50) return "bearish_steady";
    return "sideways_neutral";
  }

  detectVolatility(data) {
    // Logic: Compare current range vs average (simplified for demo)
    const vol = data.vol_index || 0.5;
    if (vol > 0.8) return "high_expansion";
    if (vol < 0.3) return "low_compression";
    return "stable";
  }

  detectMomentum(rsi) {
    if (rsi > 70) return "overbought_stretching";
    if (rsi > 55) return "strong_positive";
    if (rsi < 30) return "oversold_rebound_potential";
    if (rsi < 45) return "weak_negative";
    return "neutral";
  }

  detectVWAPRelation(price, vwap) {
    if (!vwap) return "unknown";
    const diff = (price - vwap) / vwap * 100;
    if (diff > 1) return "above_stretching";
    if (diff < -1) return "below_rejecting";
    return "retesting_anchor";
  }

  detectPriceStructure(data) {
    // Simplified breakout logic
    if (data.is_breakout) return "breakout";
    if (data.is_breakdown) return "breakdown";
    return "consolidation";
  }

  detectRegime(change, rsi, volume) {
    if (Math.abs(change) < 0.5 && rsi > 45 && rsi < 55) return "accumulation";
    if (change > 1 && volume > 1.5) return "markup_phase";
    if (change < -1 && volume > 1.5) return "panic_volatility";
    if (change > 0 && rsi > 60) return "bullish_trend";
    if (change < 0 && rsi < 40) return "bearish_trend";
    return "sideways_range";
  }
}

module.exports = new FeatureService();
