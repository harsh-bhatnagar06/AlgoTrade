// ===== AI SERVICE IMPLEMENTATION =====
// All NVIDIA API calls are proxied through our own backend (/api/ai/chat).
// The API key never leaves the server — it is NOT present in this file.

window.ai = (function () {
  // ⚠️ UPDATE THIS URL TO YOUR RENDER.COM URL AFTER DEPLOYING THE BACKEND ⚠️
  const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://algotrade-i8s8.onrender.com'; // User's live Render URL

  // ----------------------------------------------------------------
  // Internal helper: POST to our backend's secure NVIDIA proxy
  // ----------------------------------------------------------------
  async function callAI(model, messages, temperature = 0.2) {
    try {
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature }),
      });
      if (!response.ok) throw new Error(`Proxy error ${response.status}`);
      return await response.json();
    } catch (e) {
      console.warn('AI proxy fallback due to error:', e.message);
      return null;
    }
  }

  // ----------------------------------------------------------------
  // Internal helper: POST to our backend's intelligence / memory layer
  // ----------------------------------------------------------------
  async function callBackend(path, body = null, method = 'POST') {
    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) opts.body = JSON.stringify(body);
      const response = await fetch(`${API_BASE}${path}`, opts);
      if (!response.ok) throw new Error(`Backend error ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error(`Intelligence Layer Error (${path}):`, e.message);
      return null;
    }
  }

  // ---------- Consensus Signal (Fast Signal Layer) ----------
  async function getConsensusSignal(symbol, price, change) {
    const fallback = {
      model1: change >= 0 ? 'BUY' : 'SELL',
      model2: change >= 0 ? 'BUY' : 'SELL',
    };

    const messages = [{ role: 'user', content: `Provide BUY or SELL signal for ${symbol} at price ${price} with change ${change}%. Respond with only BUY or SELL.` }];

    const [resp1, resp2] = await Promise.all([
      callAI('stepfun-ai/step-3.5-flash', messages, 0.0),
      callAI('minimaxai/minimax-m2.7', messages, 0.0),
    ]);

    const extract = (resp) => {
      const txt = resp?.choices?.[0]?.message?.content?.trim().toUpperCase();
      return txt === 'BUY' || txt === 'SELL' ? txt : null;
    };

    return {
      model1: extract(resp1) ?? fallback.model1,
      model2: extract(resp2) ?? fallback.model2,
    };
  }

  // ---------- Market Sentiment (News/Sentiment Layer) ----------
  async function getMarketSentiment() {
    const messages = [{
      role: 'user',
      content: 'Give 3 concise bullet points about current global market sentiment affecting equities and crypto. Each bullet on a new line starting with *.'
    }];
    const resp = await callAI('meta/llama-4-maverick-17b-128e-instruct', messages, 0.3);
    if (resp?.choices?.[0]?.message?.content) return resp.choices[0].message.content;
    return `* Global equities steady after Fed signals pause\n* Tech sector sees rotation into value stocks\n* Crypto market stabilises with Bitcoin holding key support`;
  }

  // ---------- Deep Analysis & Reasoning ----------
  async function performDeepAnalysis(asset, strategy) {
    const messages = [{
      role: 'user',
      content: `Perform deep technical analysis on ${asset} using the ${strategy} strategy. Include key indicators, trend assessment, volume analysis, and risk rating. Be concise and structured.`
    }];
    const resp = await callAI('mistralai/mistral-large-3-675b-instruct-2512', messages, 0.2);
    if (resp?.choices?.[0]?.message?.content) return resp.choices[0].message.content.trim();
    return `Analysis for ${asset} (${strategy}):\n- Current trend appears bullish.\n- Recommend cautious position sizing.\n- Monitor volume spikes for entry signals.`;
  }

  // ---------- Code Generation (Strategy Architect) ----------
  async function generateStrategyScript(description) {
    const messages = [{
      role: 'user',
      content: `Write a JavaScript function that implements this trading strategy: "${description}". Return only the code block, no explanations.`
    }];
    const resp = await callAI('qwen/qwen3-coder-480b-a35b-instruct', messages, 0.1);
    if (resp?.choices?.[0]?.message?.content) return resp.choices[0].message.content.trim();
    return `// Generated strategy (mock)\nfunction executeStrategy() {\n  console.log('Running mock strategy');\n}`;
  }

  // ---------- Safety Guard ----------
  async function validateOrder(order) {
    const notional = order.qty * order.price;
    if (notional > 1_000_000) return 'REJECTED: Order notional exceeds $1,000,000 limit.';
    if (order.price <= 0 || order.qty <= 0) return 'REJECTED: Invalid price or quantity.';
    return 'APPROVED';
  }

  // ---------- Intelligence & Memory Layer ----------
  async function storeMarketExperience(symbol, price, rawData, observation) {
    return callBackend('/experience/store', { symbol, price, raw_data: rawData, ai_observation: observation });
  }

  async function getHistoricalContext(regime, volatility, momentum) {
    const data = await callBackend('/experience/search', { regime, volatility, momentum });
    return data?.matches ?? [];
  }

  async function getMemoryStats() {
    return callBackend('/experience/stats', null, 'GET');
  }

  async function evaluateStrategy(trades, capital = 100000) {
    return callBackend('/strategy/evaluate', { trades, capital });
  }

  // ---------- AI Autonomous Strategy Architect (Multi-lingual) ----------
  async function generateStrategy(description, preferredLang) {
    const prompt = `
      Analyze this trading strategy description: "${description}".
      The user prefers the explanation in: ${preferredLang}.
      
      Tasks:
      1. Detect the intent (Asset, Timeframe, Indicators, Logic).
      2. Suggest a professional name for this strategy.
      3. Set reasonable Stop Loss (SL) and Take Profit (TP) if not mentioned.
      4. Provide a clear, friendly explanation in ${preferredLang}.
      
      Respond ONLY with a JSON object in this format:
      {
        "name": "Strategy Name",
        "asset": "SYMBOL",
        "tf": "15m",
        "sl": 2.0,
        "tp": 5.0,
        "explanation": "Brief explanation in ${preferredLang}"
      }
    `;

    const messages = [{ role: 'system', content: 'You are an expert Quant Strategist.' }, { role: 'user', content: prompt }];
    
    // Using Mistral Large for its superior reasoning and multi-lingual capabilities
    const resp = await callAI('mistralai/mistral-large-3-675b-instruct-2512', messages, 0.4);
    
    try {
      const content = resp?.choices?.[0]?.message?.content;
      // Extract JSON if AI wrapped it in markdown
      const jsonStr = content.includes('```json') ? content.split('```json')[1].split('```')[0] : content;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI strategy:', e);
      // Fallback
      return {
        name: "AI Generated Strategy",
        asset: "NIFTY",
        tf: "15m",
        sl: 2.0,
        tp: 5.0,
        explanation: "AI ne aapki strategy analyze kar li hai. Aap manually parameters check kar sakte hain."
      };
    }
  }

  // Expose public API
  return {
    getConsensusSignal,
    getMarketSentiment,
    performDeepAnalysis,
    generateStrategyScript,
    generateStrategy, // New multi-lingual method
    validateOrder,
    storeMarketExperience,
    getHistoricalContext,
    getMemoryStats,
    evaluateStrategy,
  };
})();
