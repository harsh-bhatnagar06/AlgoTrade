/**
 * PortfolioManager
 * Maintains the real-time state of positions, equity, and allocation.
 */
class PortfolioManager {
    constructor() {
        this.state = {
            totalValue: 100000,
            cash: 100000,
            positions: [],
            dailyPnl: 0,
            realizedPnl: 0,
            unrealizedPnl: 0
        };
    }

    init() {
        window.eventBus.on(window.EVENTS.ORDER_FILLED, (order) => this.handleFill(order));
        window.eventBus.on(window.EVENTS.MARKET_DATA_UPDATE, (data) => this.updateUnrealized(data));
    }

    handleFill(order) {
        console.log("PortfolioManager: Handling fill...", order);
        
        const existing = this.state.positions.find(p => p.symbol === order.symbol);
        
        if (order.side === 'BUY') {
            if (existing) {
                // Average up/down
                const totalQty = existing.qty + order.qty;
                existing.avgPrice = ((existing.qty * existing.avgPrice) + (order.qty * order.price)) / totalQty;
                existing.qty = totalQty;
            } else {
                this.state.positions.push({
                    symbol: order.symbol,
                    qty: order.qty,
                    avgPrice: order.price,
                    currentPrice: order.price,
                    pnl: 0,
                    pnlPct: 0
                });
            }
            this.state.cash -= (order.qty * order.price);
        } else {
            // Sell logic
            if (existing) {
                const sellQty = Math.min(existing.qty, order.qty);
                const profit = sellQty * (order.price - existing.avgPrice);
                this.state.realizedPnl += profit;
                existing.qty -= sellQty;
                this.state.cash += (sellQty * order.price);
                
                if (existing.qty <= 0) {
                    this.state.positions = this.state.positions.filter(p => p.symbol !== order.symbol);
                }
            }
        }
        
        this.calculateTotal();
    }

    updateUnrealized(data) {
        const pos = this.state.positions.find(p => p.symbol === data.symbol);
        if (pos) {
            pos.currentPrice = data.price;
            pos.pnl = pos.qty * (pos.currentPrice - pos.avgPrice);
            pos.pnlPct = ((pos.currentPrice / pos.avgPrice) - 1) * 100;
        }
        
        this.calculateTotal();
    }

    calculateTotal() {
        this.state.unrealizedPnl = this.state.positions.reduce((sum, p) => sum + p.pnl, 0);
        this.state.totalValue = this.state.cash + this.state.unrealizedPnl + this.state.positions.reduce((sum, p) => sum + (p.qty * p.avgPrice), 0);
        
        window.eventBus.emit(window.EVENTS.PORTFOLIO_UPDATE, this.state);
    }

    getSnapshot() {
        return { ...this.state };
    }
}

window.portfolioManager = new PortfolioManager();
window.portfolioManager.init();
