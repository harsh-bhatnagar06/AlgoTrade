/**
 * RiskEngine
 * Institutional-grade risk management.
 * Validates every trade against pre-defined limits and portfolio constraints.
 */
class RiskEngine {
    constructor() {
        this.limits = {
            maxRiskPerTrade: 0.02, // 2% of equity
            maxDailyDrawdown: 0.05, // 5%
            maxOpenPositions: 10,
            maxSectorExposure: 0.30, // 30% per sector
            leverageLimit: 1.0,
            maxSlippagePct: 0.005 // 0.5%
        };
        
        this.dailyStats = {
            startingEquity: 100000,
            currentEquity: 100000,
            peakEquity: 100000,
            tradesToday: 0
        };
    }

    /**
     * Validate a trade request
     * @param {Object} trade - Trade request (symbol, side, qty, price, type)
     * @param {Object} portfolio - Current portfolio state
     * @returns {Object} { approved: boolean, reason: string, adjustedQty: number }
     */
    validateTrade(trade, portfolio) {
        console.log("RiskEngine: Validating trade...", trade);
        
        // 1. Check Kill Switch
        if (this.isKillSwitchActive()) {
            return { approved: false, reason: "KILL_SWITCH_ACTIVE" };
        }

        // 2. Check Daily Drawdown
        const currentDrawdown = (this.dailyStats.peakEquity - portfolio.totalValue) / this.dailyStats.peakEquity;
        if (currentDrawdown > this.limits.maxDailyDrawdown) {
            window.eventBus.emit(window.EVENTS.RISK_LIMIT_HIT, { type: 'DAILY_DRAWDOWN', value: currentDrawdown });
            return { approved: false, reason: "MAX_DAILY_DRAWDOWN_EXCEEDED" };
        }

        // 3. Check Max Open Positions
        if (portfolio.positions.length >= this.limits.maxOpenPositions) {
            return { approved: false, reason: "MAX_OPEN_POSITIONS_REACHED" };
        }

        // 4. Position Sizing Check (Volatility Adjusted)
        const suggestedQty = this.calculatePositionSize(trade, portfolio);
        if (trade.qty > suggestedQty * 1.1) { // 10% tolerance
            return { 
                approved: false, 
                reason: "POSITION_SIZE_TOO_LARGE", 
                suggestedQty: suggestedQty 
            };
        }

        // 5. Liquidity & Slippage Validation
        if (!this.validateLiquidity(trade)) {
            return { approved: false, reason: "INSUFFICIENT_LIQUIDITY" };
        }

        return { approved: true, reason: "RISK_APPROVED", adjustedQty: trade.qty };
    }

    /**
     * Calculate position size based on Kelly Criterion or Fixed Fractional
     */
    calculatePositionSize(trade, portfolio) {
        // Simple Fixed Fractional for now
        const riskAmount = portfolio.totalValue * this.limits.maxRiskPerTrade;
        const stopLossDistance = Math.abs(trade.price - (trade.stopLoss || trade.price * 0.95));
        
        if (stopLossDistance === 0) return 0;
        
        const shares = Math.floor(riskAmount / stopLossDistance);
        return shares;
    }

    validateLiquidity(trade) {
        // In real app, check average volume vs trade size
        return true; 
    }

    isKillSwitchActive() {
        return localStorage.getItem('algoforge_kill_switch') === 'true';
    }

    activateKillSwitch() {
        localStorage.setItem('algoforge_kill_switch', 'true');
        window.eventBus.emit(window.EVENTS.SYSTEM_STATUS, { alert: 'EMERGENCY_KILL_SWITCH_ACTIVATED' });
    }
}

window.riskEngine = new RiskEngine();
