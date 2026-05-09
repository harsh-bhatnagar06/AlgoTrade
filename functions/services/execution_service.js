/**
 * Execution Service — Order Lifecycle Management
 * Orchestrates the flow from AI signal to broker execution.
 */

const riskService = require('./risk_service');
const supabase = require('./db');

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

  async logOrderToDb(order) {
    const { data, error } = await supabase
      .from('trade_orders')
      .insert([
        {
          symbol: order.symbol,
          side: order.side,
          type: order.type || 'MARKET',
          qty: order.qty,
          price: order.price,
          status: order.status,
          ai_confidence: order.ai_confidence || 0.8,
          risk_score: order.risk_score
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error("Failed to log order:", error);
      throw new Error("Database error logging order");
    }

    return data.id;
  }

  async updateOrderStatus(orderId, status, executionPrice, brokerOrderId) {
    const { error } = await supabase
      .from('trade_orders')
      .update({
        status,
        execution_price: executionPrice,
        broker_order_id: brokerOrderId
      })
      .eq('id', orderId);

    if (error) {
      console.error("Failed to update order status:", error);
      return;
    }

    // If filled, update positions
    if (status === 'FILLED') {
      await this.syncPositionFromFill(orderId);
    }
  }

  async syncPositionFromFill(orderId) {
    const { data: order, error: orderError } = await supabase
      .from('trade_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) return;

    // Check existing position
    const { data: existingPos } = await supabase
      .from('active_positions')
      .select('*')
      .eq('symbol', order.symbol)
      .single();

    if (existingPos) {
      const newQty = existingPos.qty + order.qty;
      // Note: for a robust implementation, side should be considered (buy vs sell)
      const newEntryPrice = (existingPos.entry_price * existingPos.qty + order.execution_price * order.qty) / newQty;
      
      await supabase
        .from('active_positions')
        .update({
          qty: newQty,
          entry_price: newEntryPrice,
          last_updated: new Date().toISOString()
        })
        .eq('symbol', order.symbol);
    } else {
      await supabase
        .from('active_positions')
        .insert([
          {
            symbol: order.symbol,
            qty: order.qty,
            entry_price: order.execution_price,
            side: order.side
          }
        ]);
    }
  }

  async logRiskEvent(type, description) {
    await supabase
      .from('risk_events')
      .insert([
        {
          event_type: type,
          description: description,
          severity: 'HIGH'
        }
      ]);
  }
}

module.exports = new ExecutionService();
