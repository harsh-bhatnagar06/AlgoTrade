require('dotenv').config({ path: '../.env' }); // For local emulator support
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Set options
setGlobalOptions({ maxInstances: 10, region: 'asia-south1' });

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

// Middleware
app.use(cors({ origin: true })); // Firebase needs proper CORS
app.use(express.json());
app.use(morgan('dev'));

// Get Secrets from env or Firebase Secret Manager
const getSecret = (key) => process.env[key] || '';

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: "Intelligence Layer Active", engine: "AlgoForge Firebase v2.0" });
});

// Config Endpoint
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: getSecret('SUPABASE_URL'),
    supabaseAnonKey: getSecret('SUPABASE_ANON_KEY'),
  });
});

// NVIDIA AI Proxy
app.post('/api/ai/chat', async (req, res) => {
  try {
    const NVIDIA_API_KEY = getSecret('NVIDIA_API_KEY');
    const { messages } = req.body;
    
    const systemPrompt = {
      role: 'system',
      content: `You are AlgoForge AI — a professional trading manager and advisor. You behave like a senior portfolio manager at a top hedge fund.
Your role:
- Discuss market problems and give clear, actionable solutions
- Provide stock analysis, strategy suggestions, risk assessment
- Be conversational but professional
- Support Hindi, Hinglish, and English
- Give structured advice: analysis first, then recommendation, then risk
- Reference real market concepts
- Be concise but thorough

You have access to Angel One broker for Indian markets. The user can buy and sell stocks through this system.`
    };

    const fullMessages = [systemPrompt, ...(messages || [{ role: 'user', content: req.body.message || 'Hello' }])];

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-large-3-675b-instruct-2512',
        messages: fullMessages,
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || 'I apologize, I could not process that request. Please try again.';
    res.json({ reply });
  } catch (err) {
    console.error('AI Chat error:', err);
    res.status(500).json({ error: 'AI proxy request failed' });
  }
});

// Broker Login Proxy
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
          'X-PrivateKey': getSecret('ANGEL_ONE_API_KEY'),
        },
        body: JSON.stringify(req.body),
      }
    );
    res.status(response.status).json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broker Request Proxy
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
          'X-PrivateKey': getSecret('ANGEL_ONE_API_KEY'),
        },
        body: reqBody ? JSON.stringify(reqBody) : undefined,
      }
    );
    res.status(response.status).json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Intelligence Routes
app.post('/api/experience/store', async (req, res) => {
  try {
    const { symbol, price, raw_data, ai_observation } = req.body;
    const features = featureService.extractSemanticFeatures(raw_data || { price, change: 0, rsi: 50 });
    const result = await memoryService.storeExperience({
      symbol, price, features,
      observation: ai_observation || "System snapshot.",
      confidence: 0.85
    });
    res.json({ ...result, features });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/experience/search', async (req, res) => {
  try {
    const matches = await memoryService.findSimilarSituations(req.body);
    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/experience/stats', async (req, res) => {
  try {
    res.json(await memoryService.getStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/experience/outcome', async (req, res) => {
  try {
    const { memory_id, outcomes } = req.body;
    res.json(await outcomeService.recordOutcome(memory_id, outcomes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/strategy/evaluate', (req, res) => {
  try {
    const { trades, capital } = req.body;
    res.json(evaluationService.evaluateStrategy(trades, capital));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/execution/trade', async (req, res) => {
  try {
    const { tradeRequest, portfolio } = req.body;
    res.json(await executionService.executeTrade(tradeRequest, portfolio));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/execution/update-order', async (req, res) => {
  try {
    const { order_id, status, execution_price, broker_order_id } = req.body;
    await executionService.updateOrderStatus(order_id, status, execution_price, broker_order_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portfolio/state', async (req, res) => {
  try {
    res.json(await portfolioService.getLocalPortfolio());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/risk/logs', async (req, res) => {
  try {
    res.json(await portfolioService.getRiskLogs());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/intelligence/think', async (req, res) => {
  try {
    const { symbol, price } = req.query;
    const result = await intelligenceOrchestrator.think(symbol, { price: parseFloat(price), history: [] });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/intelligence/regime', async (req, res) => {
  try {
    const regime = await regimeService.detectRegime({ index_change: 1.8, vol_index: 0.4 });
    res.json(regime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the Express API as a Firebase Function named 'api'
exports.api = onRequest(
  app
);
