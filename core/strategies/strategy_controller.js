/**
 * StrategyController
 * Unified interface for all trading strategies.
 * Orchestrates the Signal -> AI Eval -> Execution flow.
 */
class StrategyController {
    constructor() {
        this.activeStrategies = new Map();
    }

    /**
     * Register and start a strategy
     */
    async activate(strategy) {
        console.log(`StrategyController: Activating ${strategy.name}`);
        this.activeStrategies.set(strategy.id, strategy);
        
        // Listen for signals from this strategy
        strategy.onSignal(async (signal) => {
            await this.processSignal(strategy, signal);
        });
    }

    /**
     * The unified intelligence pipeline flow
     */
    async processSignal(strategy, signal) {
        console.log(`StrategyController: Processing signal for ${strategy.name}`, signal);

        // 1. AI Context Evaluation (The Filter)
        const aiResult = await window.intelligenceEngine.evaluateSetup({
            symbol: signal.symbol,
            signal: signal.type, // BUY/SELL
            price: signal.price,
            regime: signal.regime,
            volatility: signal.volatility
        });

        if (!aiResult.approved) {
            console.warn(`StrategyController: Signal rejected by AI Evaluator. Reason: ${aiResult.reasoning}`);
            return;
        }

        // 2. Risk Engine Validation & Position Sizing
        const tradeRequest = {
            symbol: signal.symbol,
            side: signal.type,
            qty: signal.requestedQty,
            price: signal.price,
            type: 'MARKET',
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit
        };

        const riskResult = window.riskEngine.validateTrade(tradeRequest, window.portfolioManager.getSnapshot());
        
        if (!riskResult.approved) {
            console.warn(`StrategyController: Trade rejected by Risk Engine. Reason: ${riskResult.reason}`);
            return;
        }

        // 3. Execution
        const finalOrder = {
            ...tradeRequest,
            qty: riskResult.adjustedQty || tradeRequest.qty,
            strategyId: strategy.id
        };

        const execResult = await window.executionManager.execute(finalOrder);
        
        if (execResult.success) {
            console.log(`StrategyController: Successfully executed ${finalOrder.side} ${finalOrder.symbol}`);
        }
    }

    stop(id) {
        this.activeStrategies.delete(id);
    }
}

window.strategyController = new StrategyController();
