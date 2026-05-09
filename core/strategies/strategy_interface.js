/**
 * StrategyInterface
 * Base class for all AlgoForge strategies.
 * Ensures a unified structure for signals, validation, and risk.
 */
class StrategyInterface {
    constructor(name, config = {}) {
        this.id = `STRAT-${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        this.config = config;
        this.signalListeners = [];
    }

    /**
     * Entry point for market data updates
     */
    onMarketUpdate(data) {
        const signal = this.generateSignal(data);
        if (signal) {
            this.signalListeners.forEach(callback => callback(signal));
        }
    }

    /**
     * Must be implemented by subclasses
     * @returns {Object|null} { symbol, type, price, stopLoss, takeProfit, requestedQty }
     */
    generateSignal(data) {
        throw new Error("generateSignal() not implemented");
    }

    /**
     * Validate conditions before signal generation
     */
    validateConditions(data) {
        return true;
    }

    /**
     * Calculate risk for the specific setup
     */
    calculateRisk(signal) {
        return {
            score: 0.5,
            reason: "Standard risk assessment"
        };
    }

    /**
     * Subscribe to signals
     */
    onSignal(callback) {
        this.signalListeners.push(callback);
    }

    /**
     * Explain the decision logic
     */
    explainDecision() {
        return "Generic strategy logic based on technical indicators.";
    }
}

if (typeof module !== 'undefined') {
    module.exports = StrategyInterface;
} else {
    window.StrategyInterface = StrategyInterface;
}
