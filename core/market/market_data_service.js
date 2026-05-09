/**
 * MarketDataService
 * Responsible for streaming, aggregating, and normalizing market data.
 */
class MarketDataService {
    constructor() {
        this.subscriptions = new Set();
        this.cache = new Map();
        this.mode = 'live'; // live, delayed, replay, historical
        this.status = 'disconnected';
    }

    /**
     * Initialize the service
     */
    async init() {
        return new Promise((resolve) => {
            console.log("MarketDataService: Initializing...");
            this.status = 'connecting';
            window.eventBus.emit(window.EVENTS.SYSTEM_STATUS, { service: 'MarketData', status: 'connecting' });
            
            // In a real implementation, this would connect to WebSockets
            // For now, we simulate connectivity
            setTimeout(() => {
                this.status = 'connected';
                window.eventBus.emit(window.EVENTS.SYSTEM_STATUS, { service: 'MarketData', status: 'connected' });
                resolve();
            }, 1000);
        });
    }

    /**
     * Subscribe to a symbol
     */
    subscribe(symbol) {
        this.subscriptions.add(symbol);
        console.log(`MarketDataService: Subscribed to ${symbol}`);
    }

    /**
     * Unsubscribe from a symbol
     */
    unsubscribe(symbol) {
        this.subscriptions.delete(symbol);
    }

    /**
     * Update price data (called by WebSocket handlers)
     */
    updatePrice(symbol, data) {
        const normalized = this.normalize(symbol, data);
        this.cache.set(symbol, normalized);
        
        window.eventBus.emit(window.EVENTS.MARKET_DATA_UPDATE, normalized);
        
        // Detect regime change (simplified)
        this.detectRegime(symbol, normalized);
    }

    /**
     * Normalize data from various sources (Crypto, Equity, etc.)
     */
    normalize(symbol, raw) {
        return {
            symbol: symbol,
            price: raw.price || raw.ltp || 0,
            change: raw.change || 0,
            volume: raw.volume || 0,
            timestamp: Date.now(),
            high: raw.high || 0,
            low: raw.low || 0,
            bid: raw.bid || 0,
            ask: raw.ask || 0
        };
    }

    /**
     * Detect market regime
     */
    detectRegime(symbol, data) {
        // Mock regime detection logic
        // Trending, Volatile, Ranging, Low Liquidity
        let regime = 'Ranging';
        if (Math.abs(data.change) > 2) regime = 'Trending';
        if (Math.abs(data.change) > 5) regime = 'Volatile';
        
        window.eventBus.emit(window.EVENTS.MARKET_REGIME_CHANGE, {
            symbol,
            regime,
            confidence: 0.85
        });
    }

    setMode(mode) {
        this.mode = mode;
        console.log(`MarketDataService: Mode set to ${mode}`);
    }
}

window.marketDataService = new MarketDataService();
