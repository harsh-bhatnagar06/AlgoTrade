// ===== ANGEL ONE BROKER SERVICE (Server Proxy Version) =====
// All API calls go through our backend proxy (/api/broker/*)
// so the SmartAPI key never leaves the server.

window.broker = (function () {
  // ⚠️ UPDATE THIS URL TO YOUR RENDER.COM URL AFTER DEPLOYING THE BACKEND ⚠️
  const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : ''; // Replace '' with your Render URL when going live
  let jwtToken = null;
  let clientCode = null;

  /**
   * Authenticated request via server proxy
   */
  async function brokerRequest(path, method = 'GET', body = null) {
    if (!jwtToken) return { success: false, error: "Broker not connected" };
    try {
      const response = await fetch(`${API_BASE}/api/broker/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, method, body: body, jwtToken })
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Login via server proxy — credentials entered in browser UI
   */
  async function login(code, password, totp) {
    console.log("Connecting to Angel One via secure proxy...");
    clientCode = code;

    try {
      const response = await fetch(`${API_BASE}/api/broker/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientcode: code, password, totp })
      });

      const data = await response.json();
      if (data.status) {
        jwtToken = data.data.jwtToken;
        console.log("Broker Login Successful!");
        return { success: true, data: data.data };
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Broker Login Error:", error);
      return { success: false, error: error.message };
    }
  }

  async function getProfile() {
    return brokerRequest("/rest/auth/angelbroking/user/v1/getProfile");
  }

  async function getLTP(exchange, symbol, token) {
    return brokerRequest("/rest/auth/angelbroking/market/v1/quote", "POST", {
      mode: "LTP",
      exchangeTokens: { [exchange]: [token] }
    });
  }

  async function placeOrder(params) {
    if (!jwtToken) {
      console.log("Paper Trading Mode: Simulating order...");
      return { 
        status: true, message: "SUCCESS", 
        data: { orderid: "PAPER-" + Math.random().toString(36).substr(2, 9) } 
      };
    }
    
    return brokerRequest("/rest/auth/angelbroking/order/v1/placeOrder", "POST", {
      variety: "NORMAL",
      tradingsymbol: params.symbol,
      symboltoken: params.token || "0",
      transactiontype: params.side,
      exchange: params.exchange || "NSE",
      ordertype: params.type || "MARKET",
      producttype: params.productType || "INTRADAY",
      duration: "DAY",
      price: params.price || 0,
      squareoff: params.squareoff || 0,
      stoploss: params.stoploss || 0,
      quantity: params.qty
    });
  }

  async function getPositions() {
    return brokerRequest("/rest/auth/angelbroking/order/v1/getPosition");
  }

  async function getOrderBook() {
    return brokerRequest("/rest/auth/angelbroking/order/v1/getOrderBook");
  }

  async function getHoldings() {
    return brokerRequest("/rest/auth/angelbroking/portfolio/v1/getHolding");
  }

  return {
    login,
    getProfile,
    getLTP,
    placeOrder,
    getPositions,
    getOrderBook,
    getHoldings,
    isConnected: () => !!jwtToken,
    getClientCode: () => clientCode
  };
})();
