const supabase = require('./db');

class MemoryService {
  /**
   * Stores a new market experience.
   */
  async storeExperience(data) {
    const { symbol, price, features, observation, confidence } = data;
    
    const { data: result, error } = await supabase
      .from('market_memories')
      .insert([
        {
          symbol,
          price,
          regime: features.regime,
          volatility: features.volatility,
          trend: features.trend,
          momentum: features.momentum,
          vwap_relation: features.vwap_relation,
          observation,
          confidence: confidence || 0.8,
          raw_metadata: JSON.stringify(features)
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error("Supabase Insert Error:", error);
      throw new Error("Failed to store memory: " + error.message);
    }

    return { id: result.id, status: "Experience Stored" };
  }

  /**
   * Finds similar historical situations using weighted scoring.
   */
  async findSimilarSituations(targetState, limit = 5) {
    const { data: memories, error } = await supabase
      .from('market_memories')
      .select('*, memory_outcomes(*)')
      .order('timestamp', { ascending: false })
      .limit(500);
      
    if (error) throw new Error("Failed to fetch memories");

    const results = memories.map(memory => {
      const score = this.calculateSimilarity(targetState, memory);
      return {
        similarity: score,
        experience: memory // includes outcomes due to the join
      };
    });

    return results
      .filter(r => r.similarity > 0.4) // Filter out low quality matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  calculateSimilarity(current, historical) {
    let score = 0;

    // 1. Regime Match (40% Weight)
    if (current.regime === historical.regime) score += 0.4;
    
    // 2. Trend Match (30% Weight)
    if (current.trend === historical.trend) score += 0.3;
    
    // 3. Volatility Match (20% Weight)
    if (current.volatility === historical.volatility) score += 0.2;
    
    // 4. VWAP Relation (10% Weight)
    if (current.vwap_relation === historical.vwap_relation) score += 0.1;

    return parseFloat(score.toFixed(2));
  }

  async getStats() {
    const { count, error } = await supabase
      .from('market_memories')
      .select('*', { count: 'exact', head: true });

    const { data: symbolsData } = await supabase
      .from('market_memories')
      .select('symbol');
      
    // deduplicate symbols
    const symbols = [...new Set(symbolsData?.map(s => s.symbol) || [])];

    const { data: lastRecord } = await supabase
      .from('market_memories')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    return {
      total_records: count || 0,
      symbols: symbols,
      last_sync: lastRecord ? lastRecord.timestamp : null
    };
  }
}

module.exports = new MemoryService();

module.exports = new MemoryService();
