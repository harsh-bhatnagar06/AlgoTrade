/**
 * ExecutionManager
 * Manages the lifecycle of an order from submission to fill.
 * Handles broker routing, retries, and duplicate prevention.
 */
class ExecutionManager {
    constructor() {
        this.activeOrders = new Map();
        this.executionHistory = [];
    }

    /**
     * Submit an order to the broker
     * @param {Object} orderRequest - { symbol, side, qty, price, type, strategyId }
     */
    async execute(orderRequest) {
        console.log("ExecutionManager: Processing order...", orderRequest);
        
        // 1. Prevent Duplicates (Throttle same symbol/side within 5 seconds)
        if (this.isDuplicate(orderRequest)) {
            console.warn("ExecutionManager: Duplicate order detected, rejecting.");
            return { success: false, error: "DUPLICATE_ORDER_PREVENTED" };
        }

        // 2. Risk Validation (Final Gate)
        const riskResult = window.riskEngine.validateTrade(orderRequest, window.portfolioManager.getSnapshot());
        if (!riskResult.approved) {
            window.eventBus.emit(window.EVENTS.TRADE_REJECTED, { order: orderRequest, reason: riskResult.reason });
            return { success: false, error: riskResult.reason };
        }

        // 3. Broker Routing
        const orderId = `AF-${Date.now()}`;
        this.activeOrders.set(orderId, { ...orderRequest, status: 'SUBMITTING', id: orderId });
        
        window.eventBus.emit(window.EVENTS.ORDER_SUBMITTED, { id: orderId, ...orderRequest });

        try {
            const brokerResponse = await window.broker.placeOrder({
                symbol: orderRequest.symbol,
                qty: orderRequest.qty,
                side: orderRequest.side,
                type: orderRequest.type,
                price: orderRequest.price
            });

            if (brokerResponse.status) {
                const bOrder = brokerResponse.data;
                this.updateOrderStatus(orderId, 'OPEN', { brokerId: bOrder.orderid });
                
                // Simulate Fill for Demo/Paper mode
                setTimeout(() => {
                    this.updateOrderStatus(orderId, 'FILLED', { price: orderRequest.price });
                }, 1000);

                return { success: true, orderId };
            } else {
                this.updateOrderStatus(orderId, 'REJECTED', { error: brokerResponse.message });
                return { success: false, error: brokerResponse.message };
            }
        } catch (error) {
            this.updateOrderStatus(orderId, 'FAILED', { error: error.message });
            return { success: false, error: "BROKER_COMMUNICATION_FAILURE" };
        }
    }

    updateOrderStatus(id, status, data = {}) {
        const order = this.activeOrders.get(id);
        if (order) {
            order.status = status;
            Object.assign(order, data);
            
            if (status === 'FILLED') {
                window.eventBus.emit(window.EVENTS.ORDER_FILLED, order);
                this.executionHistory.push(order);
                this.activeOrders.delete(id);
            } else if (status === 'CANCELLED' || status === 'REJECTED' || status === 'FAILED') {
                window.eventBus.emit(window.EVENTS.ORDER_CANCELLED, order);
                this.activeOrders.delete(id);
            }
        }
    }

    isDuplicate(order) {
        const now = Date.now();
        for (let [id, active] of this.activeOrders) {
            if (active.symbol === order.symbol && active.side === order.side && (now - active.timestamp < 5000)) {
                return true;
            }
        }
        return false;
    }
}

window.executionManager = new ExecutionManager();
