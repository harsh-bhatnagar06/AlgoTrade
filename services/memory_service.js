const db = require('../db');

class MemoryService {
  constructor() {
    this.db = db;
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS market_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        symbol TEXT,
        price REAL,
        regime TEXT,
        volatility TEXT,
        trend TEXT,
        momentum TEXT,
        vwap_relation TEXT,
        observation TEXT,
        confidence REAL,
        raw_metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS memory_outcomes (
        memory_id INTEGER PRIMARY KEY,
        return_1d REAL,
        return_3d REAL,
        return_7d REAL,
        max_drawdown REAL,
        is_success BOOLEAN,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(memory_id) REFERENCES market_memories(id)
      );

      CREATE TABLE IF NOT EXISTS trade_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        broker_order_id TEXT UNIQUE,
        symbol TEXT,
        side TEXT,
        type TEXT,
        qty INTEGER,
        price REAL,
        status TEXT, -- PENDING, FILLED, REJECTED, CANCELLED
        execution_price REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ai_confidence REAL,
        risk_score REAL
      );

      CREATE TABLE IF NOT EXISTS active_positions (
        symbol TEXT PRIMARY KEY,
        qty INTEGER,
        entry_price REAL,
        side TEXT,
        sl_price REAL,
        tp_price REAL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_value REAL,
        available_margin REAL,
        unrealized_pnl REAL,
        realized_pnl REAL,
        exposure REAL
      );

      CREATE TABLE IF NOT EXISTS risk_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        event_type TEXT, -- LIMIT_EXCEEDED, ANOMALY_DETECTED, SAFETY_BLOCK
        description TEXT,
        severity TEXT
      );

      CREATE TABLE IF NOT EXISTS market_regimes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        regime_type TEXT, -- BULLISH_EXPANSION, MACRO_FEAR, etc.
        volatility_state TEXT,
        sentiment_score REAL,
        liquidity_condition TEXT,
        confidence REAL
      );

      CREATE TABLE IF NOT EXISTS ai_consensus_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        symbol TEXT,
        signal TEXT,
        confidence REAL,
        reasoning_summary TEXT,
        models_involved TEXT, -- JSON array of model IDs
        consensus_score REAL
      );

      CREATE TABLE IF NOT EXISTS opportunity_rankings (
        symbol TEXT PRIMARY KEY,
        rank_score REAL,
        confidence REAL,
        regime_match REAL,
        historical_similarity REAL,
        recommended_action TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        symbol TEXT,
        observation_type TEXT, -- ANOMALY, BREAKOUT, SENTIMENT_SHIFT
        note TEXT,
        importance TEXT -- HIGH, MEDIUM, LOW
      );

      CREATE TABLE IF NOT EXISTS strategy_adaptation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        strategy_type TEXT,
        previous_weight REAL,
        new_weight REAL,
        reason TEXT,
        regime TEXT
      );
    `);
  }

  /**
   * Stores a new market experience.
   */
  storeExperience(data) {
    const { symbol, price, features, observation, confidence } = data;
    const stmt = this.db.prepare(`
      INSERT INTO market_memories 
      (symbol, price, regime, volatility, trend, momentum, vwap_relation, observation, confidence, raw_metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      symbol,
      price,
      features.regime,
      features.volatility,
      features.trend,
      features.momentum,
      features.vwap_relation,
      observation,
      confidence || 0.8,
      JSON.stringify(features)
    );

    return { id: result.lastInsertRowid, status: "Experience Stored" };
  }

  /**
   * Finds similar historical situations using weighted scoring.
   */
  findSimilarSituations(targetState, limit = 5) {
    const memories = this.db.prepare('SELECT * FROM market_memories ORDER BY timestamp DESC LIMIT 500').all();
    
    const results = memories.map(memory => {
      const score = this.calculateSimilarity(targetState, memory);
      
      // Fetch outcomes if they exist
      const outcomes = this.db.prepare('SELECT * FROM memory_outcomes WHERE memory_id = ?').get(memory.id);
      
      return {
        similarity: score,
        experience: {
          ...memory,
          outcomes: outcomes || null
        }
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

  getStats() {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM market_memories').get().count;
    const symbols = this.db.prepare('SELECT DISTINCT symbol FROM market_memories').all().map(s => s.symbol);
    const last = this.db.prepare('SELECT timestamp FROM market_memories ORDER BY timestamp DESC LIMIT 1').get();

    return {
      total_records: count,
      symbols: symbols,
      last_sync: last ? last.timestamp : null
    };
  }
}

module.exports = new MemoryService();
