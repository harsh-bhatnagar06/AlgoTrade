/**
 * BacktestEngine
 * Professional-grade historical simulation.
 * Includes slippage, commissions, spreads, and latency simulation.
 */
class BacktestEngine {
    constructor() {
        this.config = {
            slippagePct: 0.001, // 0.1%
            commissionPct: 0.0005, // 0.05%
            spreadPct: 0.0002, // 0.02%
            latencyMs: 50,
            initialCapital: 100000
        };
    }

    /**
     * Run a simulation
     * @param {Array} history - Historical candle data
     * @param {Object} strategy - Strategy interface
     */
    async run(history, strategy) {
        console.log(`BacktestEngine: Starting simulation for ${strategy.name}`);
        
        let balance = this.config.initialCapital;
        let positions = [];
        let equityCurve = [balance];
        let trades = [];

        for (let i = 20; i < history.length; i++) {
            const context = history.slice(0, i + 1);
            const currentCandle = history[i];
            
            // 1. Update existing positions
            positions.forEach(p => {
                p.currentPrice = currentCandle.close;
                p.unrealizedPnl = p.qty * (p.currentPrice - p.entryPrice) * (p.side === 'BUY' ? 1 : -1);
            });

            // 2. Generate signal from strategy
            const signal = strategy.generateSignal(context);
            
            if (signal) {
                // Apply Slippage & Spread
                const executionPrice = this.applyExecutionCosts(signal.price, signal.type);
                
                // Risk Validation
                const riskResult = window.riskEngine.validateTrade({
                    ...signal,
                    price: executionPrice
                }, { totalValue: balance, positions });

                if (riskResult.approved) {
                    const trade = {
                        symbol: signal.symbol,
                        side: signal.type,
                        qty: riskResult.adjustedQty,
                        entryPrice: executionPrice,
                        timestamp: currentCandle.timestamp,
                        commission: executionPrice * riskResult.adjustedQty * this.config.commissionPct
                    };
                    
                    positions.push(trade);
                    balance -= trade.commission;
                }
            }

            // 3. Check Exit Conditions (SL/TP)
            positions = positions.filter(p => {
                const isExit = strategy.checkExit(p, currentCandle);
                if (isExit) {
                    const exitPrice = this.applyExecutionCosts(currentCandle.close, p.side === 'BUY' ? 'SELL' : 'BUY');
                    const pnl = p.qty * (exitPrice - p.entryPrice) * (p.side === 'BUY' ? 1 : -1);
                    const commission = exitPrice * p.qty * this.config.commissionPct;
                    
                    balance += pnl - commission;
                    trades.push({ ...p, exitPrice, pnl, commission, duration: i - p.entryIndex });
                    return false;
                }
                return true;
            });

            const currentEquity = balance + positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
            equityCurve.push(currentEquity);
        }

        return this.calculateMetrics(equityCurve, trades);
    }

    applyExecutionCosts(price, side) {
        const slippage = price * this.config.slippagePct;
        const spread = price * (this.config.spreadPct / 2);
        return side === 'BUY' ? (price + slippage + spread) : (price - slippage - spread);
    }

    calculateMetrics(equityCurve, trades) {
        const returns = [];
        for (let i = 1; i < equityCurve.length; i++) {
            returns.push((equityCurve[i] / equityCurve[i-1]) - 1);
        }

        const totalReturn = (equityCurve[equityCurve.length - 1] / equityCurve[0]) - 1;
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const stdDev = Math.sqrt(returns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length);
        
        const sharpe = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualized

        return {
            totalReturn: (totalReturn * 100).toFixed(2) + '%',
            sharpeRatio: sharpe.toFixed(2),
            maxDrawdown: this.calculateMaxDrawdown(equityCurve).toFixed(2) + '%',
            winRate: ((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1) + '%',
            totalTrades: trades.length,
            equityCurve: equityCurve
        };
    }

    calculateMaxDrawdown(equityCurve) {
        let maxPeak = equityCurve[0];
        let maxDD = 0;
        for (const val of equityCurve) {
            if (val > maxPeak) maxPeak = val;
            const dd = (maxPeak - val) / maxPeak;
            if (dd > maxDD) maxDD = dd;
        }
        return maxDD * 100;
    }
}

window.backtestEngine = new BacktestEngine();
