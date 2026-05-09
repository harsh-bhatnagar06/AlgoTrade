/**
 * IntelligenceEngine
 * The brain of AlgoForge.
 * Evaluates trade quality, learns from outcomes, and adapts strategy confidence.
 */
class IntelligenceEngine {
    constructor() {
        this.models = ['Step-3.5-Flash', 'Mistral-Large-3', 'Qwen-2.5-Coder'];
        this.confidenceThreshold = 0.75;
    }

    /**
     * Evaluate a trade setup
     * @param {Object} setup - { symbol, signal, price, indicators, regime }
     */
    async evaluateSetup(setup) {
        console.log("IntelligenceEngine: Evaluating setup...", setup);
        
        // 1. Context Gathering
        const marketContext = {
            regime: setup.regime || 'Unknown',
            volatility: setup.volatility || 'Normal',
            sentiment: await this.getSentiment(setup.symbol)
        };

        // 2. Multi-model Consensus
        const evaluation = await this.getConsensus(setup, marketContext);
        
        // 3. Experience Look-back
        const historicalPerformance = await this.queryMemory(setup);
        
        // 4. Final Scoring
        const score = this.calculateConfidence(evaluation, historicalPerformance);
        
        const approval = score >= this.confidenceThreshold;

        const result = {
            approved: approval,
            confidence: score,
            reasoning: evaluation.summary,
            riskWarnings: evaluation.warnings,
            priority: score > 0.9 ? 'HIGH' : 'NORMAL'
        };

        window.eventBus.emit(window.EVENTS.AI_INSIGHT, result);
        return result;
    }

    async getConsensus(setup, context) {
        // Mocking AI consensus call
        return {
            summary: "Bullish breakout confirmed by volume expansion in a trending regime. RSI at 62 suggests room for growth.",
            warnings: ["Resistance at 185.00 nearby", "High volatility session"],
            score: 0.82
        };
    }

    async queryMemory(setup) {
        // Query the Experience Database
        // Example: "How did breakouts perform in Low Volatility Ranging markets last week?"
        return {
            successRate: 0.65,
            avgProfit: 1.2,
            matches: 12
        };
    }

    calculateConfidence(evaluation, historical) {
        // Weighting logic: 60% current evaluation, 40% historical experience
        return (evaluation.score * 0.6) + (historical.successRate * 0.4);
    }

    async getSentiment(symbol) {
        // Simulated news sentiment fetch
        return 'Positive';
    }
}

window.intelligenceEngine = new IntelligenceEngine();
