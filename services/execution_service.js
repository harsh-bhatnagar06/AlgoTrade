/**
 * Execution Service — Order Lifecycle Management
 * Orchestrates the flow from AI signal to broker execution.
 */

const riskService = require('./risk_service');
const memoryService = require('./memory_service'); // Uses memory_service as the DB gateway

class ExecutionService {
  /**
   * Processes a trade request after user confirmation.
   */
  async executeTrade(tradeRequest, portfolio) {
    console.log(`\n[Execution] Processing ${tradeRequest.side} ${tradeRequest.qty} ${tradeRequest.symbol}...`);

    // 1. Pre-Trade Risk Validation
    const riskResult = riskService.validateOrder(tradeRequest, portfolio);
    if (!riskResult.approved) {
      console.warn(`[Execution] Order BLOCKED by Risk Engine: ${riskResult.error}`);
      this.logRiskEvent('SAFETY_BLOCK', riskResult.error);
      return { success: false, error: riskResult.error };
    }

    // 2. Log Order to Database as PENDING
    const orderId = this.logOrderToDb({
      ...tradeRequest,
      status: 'PENDING',
      risk_score: riskResult.riskProfile.score
    });

    // 3. Broker Execution
    // Note: The actual broker call happens via the frontend's window.broker, 
    // but the backend tracks the intent and status.
    console.log(`[Execution] Order ${orderId} passed risk checks. Ready for broker dispatch.`);

    return { 
      success: true, 
      order_id: orderId, 
      riskProfile: riskResult.riskProfile,
      message: "Order approved by risk engine and ready for execution." 
    };
  }

  logOrderToDb(order) {
    const stmt = memoryService.db.prepare(`
      INSERT INTO trade_orders 
      (symbol, side, type, qty, price, status, ai_confidence, risk_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      order.symbol,
      order.side,
      order.type || 'MARKET',
      order.qty,
      order.price,
      order.status,
      order.ai_confidence || 0.8,
      order.risk_score
    );

    return result.lastInsertRowid;
  }

  updateOrderStatus(orderId, status, executionPrice, brokerOrderId) {
    const stmt = memoryService.db.prepare(`
      UPDATE trade_orders 
      SET status = ?, execution_price = ?, broker_order_id = ?
      WHERE id = ?
    `);
    stmt.run(status, executionPrice, brokerOrderId, orderId);

    // If filled, update positions
    if (status === 'FILLED') {
      this.syncPositionFromFill(orderId);
    }
  }

  syncPositionFromFill(orderId) {
    const order = memoryService.db.prepare('SELECT * FROM trade_orders WHERE id = ?').get(orderId);
    if (!order) return;

    const stmt = memoryService.db.prepare(`
      INSERT INTO active_positions (symbol, qty, entry_price, side)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(symbol) DO UPDATE SET
        qty = active_positions.qty + excluded.qty,
        entry_price = (active_positions.entry_price * active_positions.qty + excluded.entry_price * excluded.qty) / (active_positions.qty + excluded.qty),
        last_updated = CURRENT_TIMESTAMP
    `);

    stmt.run(order.symbol, order.qty, order.execution_price, order.side);
  }

  logRiskEvent(type, description) {
    const stmt = memoryService.db.prepare(`
      INSERT INTO risk_events (event_type, description, severity)
      VALUES (?, ?, ?)
    `);
    stmt.run(type, description, 'HIGH');
  }
}

module.exports = new ExecutionService();
