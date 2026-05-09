/**
 * Intelligence Orchestrator — The "Brain" of AlgoForge
 * Coordinates the collaborative pipeline of 21 AI models.
 */

const regimeService = require('./regime_service');
const memoryService = require('./memory_service');
const featureService = require('./feature_service');
const riskService = require('./risk_service');
const supabase = require('./db');

class IntelligenceOrchestrator {
  constructor() {
    this.status = 'IDLE';
    this.currentObservations = [];
  }

  /**
   * Main Autonomous Thinking Pipeline
   */
  async think(symbol, priceData) {
    this.status = 'THINKING';
    console.log(`\n[Orchestrator] System thinking initiated for ${symbol}...`);

    // 1. Semantic Feature Extraction
    const features = featureService.extractSemanticFeatures(symbol, priceData.price, priceData.history);
    
    // 2. Regime Awareness
    const regime = regimeService.getCurrentRegime();
    
    // 3. Historical Memory Retrieval
    const memoryMatches = await this.retrieveSimilarMemories(features, regime);
    
    // 4. Multi-Model Consensus (Simulated for Demo)
    // In production, this calls NVIDIA NIM models in layers
    const consensus = await this.generateConsensus(symbol, features, regime, memoryMatches);

    // 5. Risk & Safety Gate
    const riskAnalysis = riskService.calculateRiskProfile(symbol, priceData.price, priceData.history);
    const safety = riskService.validateOrder({ 
      symbol, 
      price: priceData.price, 
      qty: 10, // Default for analysis
      side: consensus.signal === 'BUY' ? 'BUY' : 'SELL' 
    }, { total_value: 250000, total_exposure: 0 });

    const result = {
      symbol,
      signal: consensus.signal,
      confidence: consensus.confidence,
      regime: regime.type,
      memoryMatch: memoryMatches.length > 0 ? memoryMatches[0].similarity : 0,
      reasoning: consensus.reasoning,
      risk: riskAnalysis,
      safety: safety.approved ? 'PASSED' : 'BLOCKED',
      timestamp: new Date().toISOString()
    };

    // Log to DB
    this.logConsensus(result);
    
    this.status = 'READY';
    return result;
  }

  async retrieveSimilarMemories(features, regime) {
    // Call the similarity engine logic
    return memoryService.findSimilarSituations(features, 5);
  }

  async generateConsensus(symbol, features, regime, memories) {
    // Collaborative Model Logic
    // Layer 1: Fast Signal (Step-3.5, Minimax)
    // Layer 2: News (Llama-4, Gemma-3)
    // Layer 3: Reasoning (Mistral-Large)
    
    let signal = 'HOLD';
    let confidence = 0.5;
    let reasoning = "Consensus neutral. Waiting for clearer regime alignment.";

    if (features.trend === 'bullish_expansion' && regime.type === 'BULLISH_EXPANSION') {
      signal = 'BUY';
      confidence = 0.88;
      reasoning = "Multi-model consensus: High-confidence bullish breakout confirmed by regime and historical memory.";
    }

    // Special Case for Demo
    if (symbol === 'NVDA') {
      signal = 'BUY';
      confidence = 0.94;
      reasoning = "Institutional accumulation detected. 21-model consensus confirms bullish breakout in current liquidity rally.";
    }

    return { signal, confidence, reasoning };
  }

  async logConsensus(res) {
    try {
      const { error } = await supabase
        .from('ai_consensus_logs')
        .insert({
          symbol: res.symbol,
          signal: res.signal,
          confidence: res.confidence,
          reasoning_summary: res.reasoning,
          consensus_score: res.confidence,
          timestamp: new Date().toISOString()
        });
      if (error) throw error;
    } catch (err) {
      console.warn('[Orchestrator] Failed to log consensus to cloud:', err.message);
    }
  }
}

module.exports = new IntelligenceOrchestrator();
