// ===== SIMULATED MARKET DATA & UTILITIES =====

const SYMBOLS = [
  { sym: 'AAPL', name: 'Apple Inc.', price: 198.5, mcap: '3.1T', sector: 'Tech' },
  { sym: 'TSLA', name: 'Tesla Inc.', price: 245.2, mcap: '780B', sector: 'Auto' },
  { sym: 'NVDA', name: 'NVIDIA Corp.', price: 875.3, mcap: '2.1T', sector: 'Tech' },
  { sym: 'MSFT', name: 'Microsoft Corp.', price: 415.8, mcap: '3.0T', sector: 'Tech' },
  { sym: 'AMZN', name: 'Amazon.com', price: 185.6, mcap: '1.9T', sector: 'Consumer' },
  { sym: 'GOOGL', name: 'Alphabet Inc.', price: 168.4, mcap: '2.1T', sector: 'Tech' },
  { sym: 'META', name: 'Meta Platforms', price: 502.1, mcap: '1.3T', sector: 'Tech' },
  { sym: 'BTC-USD', name: 'Bitcoin', price: 67420, mcap: '1.3T', sector: 'Crypto' },
  { sym: 'ETH-USD', name: 'Ethereum', price: 3285, mcap: '395B', sector: 'Crypto' },
  { sym: 'SPY', name: 'S&P 500 ETF', price: 525.4, mcap: '500B', sector: 'ETF' },
  { sym: 'QQQ', name: 'Nasdaq 100 ETF', price: 445.7, mcap: '260B', sector: 'ETF' },
  { sym: 'JPM', name: 'JPMorgan Chase', price: 198.3, mcap: '570B', sector: 'Finance' },
];

const DEFAULT_STRATEGIES = [
  { id: 1, name: 'MACD Crossover', asset: 'AAPL', tf: '15m', type: 'MACD Crossover', capital: 25000, sl: 2, tp: 5, dd: 10, status: 'running', pnl: 1845.30, trades: 47, winRate: 68 },
  { id: 2, name: 'RSI Reversal', asset: 'BTC-USD', tf: '1h', type: 'RSI Mean Reversion', capital: 50000, sl: 3, tp: 8, dd: 15, status: 'running', pnl: 4210.50, trades: 23, winRate: 74 },
  { id: 3, name: 'BB Squeeze', asset: 'TSLA', tf: '5m', type: 'Bollinger Bands', capital: 15000, sl: 1.5, tp: 4, dd: 8, status: 'paused', pnl: -320.10, trades: 31, winRate: 52 },
  { id: 4, name: 'Momentum Alpha', asset: 'NVDA', tf: '1d', type: 'Momentum', capital: 40000, sl: 3, tp: 10, dd: 12, status: 'running', pnl: 7625.80, trades: 12, winRate: 83 },
];

const DEFAULT_ORDERS = [
  { time: '09:31:04', sym: 'AAPL', side: 'BUY', type: 'MARKET', qty: 100, price: 198.50, status: 'filled', strat: 'MACD Crossover' },
  { time: '09:45:22', sym: 'TSLA', side: 'SELL', type: 'LIMIT', qty: 50, price: 246.00, status: 'open', strat: 'BB Squeeze' },
  { time: '10:12:18', sym: 'NVDA', side: 'BUY', type: 'STOP', qty: 20, price: 870.00, status: 'open', strat: 'Momentum Alpha' },
  { time: '10:30:45', sym: 'BTC-USD', side: 'BUY', type: 'MARKET', qty: 0.5, price: 67420, status: 'filled', strat: 'RSI Reversal' },
  { time: '11:05:33', sym: 'AAPL', side: 'SELL', type: 'LIMIT', qty: 100, price: 200.00, status: 'open', strat: 'MACD Crossover' },
  { time: '11:22:10', sym: 'SPY', side: 'BUY', type: 'MARKET', qty: 200, price: 525.40, status: 'cancelled', strat: 'Manual' },
];

// Utility functions
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max)); }
function fmt$(v) { return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtPct(v) { return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; }
function fmtVol(v) { return v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : v.toString(); }

function generatePriceSeries(basePrice, points, volatility = 0.01) {
  const data = [basePrice];
  for (let i = 1; i < points; i++) {
    const change = data[i - 1] * volatility * (Math.random() - 0.48);
    data.push(Math.max(data[i - 1] + change, basePrice * 0.7));
  }
  return data;
}

function generateEquityCurve(initial, points) {
  const data = [initial];
  for (let i = 1; i < points; i++) {
    const drift = initial * 0.0003;
    const noise = initial * 0.005 * (Math.random() - 0.45);
    data.push(data[i - 1] + drift + noise);
  }
  return data;
}

function generateDrawdownSeries(points) {
  const dd = [0];
  let peak = 100;
  let val = 100;
  for (let i = 1; i < points; i++) {
    val += (Math.random() - 0.45) * 2;
    if (val > peak) peak = val;
    dd.push(((val - peak) / peak) * 100);
  }
  return dd;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 2500);
}
