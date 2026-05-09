/**
 * AlgoForge Event Bus
 * Centralized communication hub for all system components.
 * Decouples market data, strategies, risk, and execution.
 */
class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Remove a listener
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
}

// Global instance for the system
const eventBus = new EventBus();

// Standard Event Names
const EVENTS = {
    MARKET_DATA_UPDATE: 'MARKET_DATA_UPDATE',
    MARKET_REGIME_CHANGE: 'MARKET_REGIME_CHANGE',
    SIGNAL_GENERATED: 'SIGNAL_GENERATED',
    TRADE_REQUESTED: 'TRADE_REQUESTED',
    TRADE_APPROVED: 'TRADE_APPROVED',
    TRADE_REJECTED: 'TRADE_REJECTED',
    ORDER_SUBMITTED: 'ORDER_SUBMITTED',
    ORDER_FILLED: 'ORDER_FILLED',
    ORDER_CANCELLED: 'ORDER_CANCELLED',
    RISK_LIMIT_HIT: 'RISK_LIMIT_HIT',
    PORTFOLIO_UPDATE: 'PORTFOLIO_UPDATE',
    SYSTEM_STATUS: 'SYSTEM_STATUS',
    AI_INSIGHT: 'AI_INSIGHT'
};

if (typeof module !== 'undefined') {
    module.exports = { eventBus, EVENTS };
} else {
    window.eventBus = eventBus;
    window.EVENTS = EVENTS;
}
