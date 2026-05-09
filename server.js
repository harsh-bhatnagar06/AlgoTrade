/**
 * AlgoForge Intelligence Layer — Backend Server
 * Node.js Express server orchestrating market memory and AI reasoning.
 * All secrets are loaded from .env — never hardcoded.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Import Services
const memoryService = require('./services/memory_service');
const featureService = require('./services/feature_service');
const outcomeService = require('./services/outcome_service');
const evaluationService = require('./services/evaluation_service');
const executionService = require('./services/execution_service');
const portfolioService = require('./services/portfolio_service');
const riskService = require('./services/risk_service');
const regimeService = require('./services/regime_service');
const intelligenceOrchestrator = require('./services/intelligence_orchestrator');

const app = express();
const PORT = process.env.PORT || 5000;

// Secrets loaded from .env — never sent to the browser
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const ANGEL_ONE_API_KEY = process.env.ANGEL_ONE_API_KEY || '';

if (!NVIDIA_API_KEY) console.warn('⚠️  NVIDIA_API_KEY not set in .env');
if (!ANGEL_ONE_API_KEY) console.warn('⚠️  ANGEL_ONE_API_KEY not set in .env');

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '.')));

// --- ROUTES ---

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  res.json({ status: "Intelligence Layer Active", engine: "AlgoForge Node.js v1.0" });
});

// ============================================================
// SECURE AI PROXY — Frontend calls these. NVIDIA key stays
// on the server only, never exposed to the browser.
// ============================================================

/**
 * Proxy: NVIDIA NIM Chat Completions
 * Frontend POSTs { model, messages, temperature } → backend forwards to NVIDIA
 */
app.post('/api/ai/chat', async (req, res) => {
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('NVIDIA proxy error:', err);
    res.status(500).json({ error: 'AI proxy request failed', detail: err.message });
  }
});

// ============================================================
// SECURE BROKER PROXY — Angel One API calls proxied through
// backend so the API key is never exposed in browser code.
// ============================================================

/**
 * Proxy: Angel One Login
 */
app.post('/api/broker/login', async (req, res) => {
  try {
    const response = await fetch(
      'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': req.ip || '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': ANGEL_ONE_API_KEY,
        },
        body: JSON.stringify(req.body),
      }
    );
    res.status(response.status).json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Proxy: Angel One generic authenticated request
 * Frontend sends { path, method, body, jwtToken }
 * Backend forwards with the API key header
 */
app.post('/api/broker/request', async (req, res) => {
  const { path: apiPath, method = 'GET', body: reqBody, jwtToken } = req.body;
  if (!jwtToken) return res.status(401).json({ error: 'No JWT token provided' });

  try {
    const response = await fetch(
      `https://apiconnect.angelone.in${apiPath}`,
      {
        method,
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': req.ip || '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': ANGEL_ONE_API_KEY,
        },
        body: reqBody ? JSON.stringify(reqBody) : undefined,
      }
    );
    res.status(response.status).json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// INTELLIGENCE / MEMORY ROUTES (unchanged)
// ============================================================

app.post('/experience/store', (req, res) => {
  try {
    const { symbol, price, raw_data, ai_observation } = req.body;
    const features = featureService.extractSemanticFeatures(raw_data || { price, change: 0, rsi: 50 });
    const result = memoryService.storeExperience({
      symbol, price, features,
      observation: ai_observation || "System snapshot.",
      confidence: 0.85
    });
    res.json({ ...result, features });
  } catch (err) {
    console.error("Store Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/experience/search', (req, res) => {
  try {
    const matches = memoryService.findSimilarSituations(req.body);
    res.json({ matches });
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/experience/stats', (req, res) => {
  try {
    res.json(memoryService.getStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/experience/outcome', (req, res) => {
  try {
    const { memory_id, outcomes } = req.body;
    res.json(outcomeService.recordOutcome(memory_id, outcomes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/strategy/evaluate', (req, res) => {
  try {
    const { trades, capital } = req.body;
    res.json(evaluationService.evaluateStrategy(trades, capital));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/execution/trade', async (req, res) => {
  try {
    const { tradeRequest, portfolio } = req.body;
    res.json(await executionService.executeTrade(tradeRequest, portfolio));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/execution/update-order', (req, res) => {
  try {
    const { order_id, status, execution_price, broker_order_id } = req.body;
    executionService.updateOrderStatus(order_id, status, execution_price, broker_order_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/portfolio/state', async (req, res) => {
  try {
    res.json(await portfolioService.getLocalPortfolio());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/risk/logs', async (req, res) => {
  try {
    res.json(await portfolioService.getRiskLogs());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/intelligence/think', async (req, res) => {
  try {
    const { symbol, price } = req.query;
    const result = await intelligenceOrchestrator.think(symbol, { price: parseFloat(price), history: [] });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/intelligence/regime', async (req, res) => {
  try {
    const regime = await regimeService.detectRegime({ index_change: 1.8, vol_index: 0.4 });
    res.json(regime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    let reply = "I am analyzing the market data for your query. Current consensus indicates a bullish trend in technology sectors.";
    if (message.toLowerCase().includes('nvda')) reply = "NVDA shows strong institutional accumulation. 84% consensus for BUY.";
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n⚡ AlgoForge Intelligence Layer running on http://localhost:${PORT}`);
  console.log(`📂 Memory DB: ${memoryService.dbPath}`);
  console.log(`🚀 Ready for market learning...\n`);
});
