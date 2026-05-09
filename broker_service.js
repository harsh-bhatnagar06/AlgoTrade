// ===== ANGEL ONE BROKER SERVICE =====
// All requests are proxied through our backend (/api/broker/*).
// The Angel One API key is stored in .env on the server — never in this file.

window.broker = (function () {
  const API_BASE = window.location.origin;

  // JWT token is stored in memory only (never in localStorage for security)
  let jwtToken = null;
  let refreshToken = null;
  let feedToken = null;

  /**
   * Internal helper: call our broker proxy endpoint
   * For authenticated calls after login
   */
  async function proxyRequest(apiPath, method = 'GET', body = null) {
    if (!jwtToken) return { success: false, error: 'Not logged in' };
    try {
      const response = await fetch(`${API_BASE}/api/broker/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: apiPath, method, body, jwtToken }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Authenticates with Angel One via backend proxy.
   * The API key is injected server-side — not visible to the browser.
   */
  async function login(clientCode, password, totp) {
    console.log("Attempting Angel One Login via secure backend proxy...");
    try {
      const response = await fetch(`${API_BASE}/api/broker/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientcode: clientCode, password, totp }),
      });

      const data = await response.json();
      if (data.status) {
        jwtToken = data.data.jwtToken;
        refreshToken = data.data.refreshToken;
        feedToken = data.data.feedToken;
        console.log("Login Successful!");
        return { success: true, data: data.data };
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetches profile information
   */
  async function getProfile() {
    return proxyRequest('/rest/auth/angelbroking/user/v1/getProfile', 'GET');
  }

  /**
   * Fetches Last Traded Price (LTP) for a symbol
   */
  async function getLTP(exchange, symbol, token) {
    return proxyRequest(
      '/rest/auth/angelbroking/market/v1/quote',
      'POST',
      { mode: 'LTP', exchangeTokens: { [exchange]: [token] } }
    );
  }

  /**
   * Places an order — falls back to Paper Trading if not logged in
   */
  async function placeOrder(params) {
    if (!jwtToken) {
      console.log("Paper Trading Mode: Simulating order fill...");
      return {
        status: true,
        message: "SUCCESS",
        data: { orderid: "DEMO-" + Math.random().toString(36).substr(2, 9) }
      };
    }

    return proxyRequest(
      '/rest/auth/angelbroking/order/v1/placeOrder',
      'POST',
      {
        variety: "NORMAL",
        tradingsymbol: params.symbol,
        symboltoken: params.token,
        transactiontype: params.side,
        exchange: params.exchange || "NSE",
        ordertype: params.type || "MARKET",
        producttype: "INTRADAY",
        duration: "DAY",
        price: params.price || 0,
        squareoff: params.squareoff || 0,
        stoploss: params.stoploss || 0,
        quantity: params.qty,
      }
    );
  }

  /**
   * Fetches open positions
   */
  async function getPositions() {
    return proxyRequest('/rest/auth/angelbroking/order/v1/getPosition', 'GET');
  }

  /**
   * Fetches the order book
   */
  async function getOrderBook() {
    return proxyRequest('/rest/auth/angelbroking/order/v1/getOrderBook', 'GET');
  }

  return {
    login,
    getProfile,
    getLTP,
    placeOrder,
    getPositions,
    getOrderBook,
    isConnected: () => !!jwtToken,
  };
})();
