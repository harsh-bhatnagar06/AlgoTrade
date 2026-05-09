// ===== AlgoForge Main App =====
// Dynamically resolves backend host — works on localhost AND any hosted domain
// ⚠️ UPDATE THIS URL TO YOUR RENDER.COM URL AFTER DEPLOYING THE BACKEND ⚠️
// Example: const API_BASE = 'https://algo-api-render.onrender.com';
const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:5000' 
  : ''; // Replace '' with your Render URL when going live
const logger = new Logger('App');
let strategies = [...DEFAULT_STRATEGIES];
let orders = [...DEFAULT_ORDERS];
let nextStratId = 5;
let portfolioChart, allocationChart, backtestChart, drawdownChart, sectorChart;
let liveSymbols = SYMBOLS.map(s => ({ ...s, change: 0, vol: 0 })); // Initialized via MarketDataService

// ===== NAVIGATION =====
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('page-title').textContent = item.querySelector('.nav-label').textContent;
  });
});

document.getElementById('menu-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===== CLOCK & TICKER =====
function updateClock() {
  const now = new Date();
  document.getElementById('topbar-time').textContent = now.toLocaleTimeString('en-US', { hour12: false });
}

function updateTicker() {
  const strip = document.getElementById('ticker-strip');
  strip.innerHTML = liveSymbols.slice(0, 5).map(s => {
    const cls = s.change >= 0 ? 'up' : 'dn';
    const sign = s.change >= 0 ? '+' : '';
    return `<span class="ticker-item"><span class="ticker-sym">${s.sym}</span><span class="ticker-price">${s.price.toFixed(2)}</span><span class="ticker-chg ${cls}">${sign}${s.change.toFixed(2)}%</span></span>`;
  }).join('');
}

// ===== DASHBOARD STATS =====
function updateStats() {
  const running = strategies.filter(s => s.status === 'running');
  const totalPnl = running.reduce((a, s) => a + s.pnl, 0);
  const totalCap = strategies.reduce((a, s) => a + s.capital, 0);
  const base = 250000;
  document.getElementById('portfolio-value').textContent = fmt$(base + totalPnl);
  document.getElementById('portfolio-change').textContent = fmtPct((totalPnl / base) * 100);
  document.getElementById('portfolio-change').className = 'stat-change ' + (totalPnl >= 0 ? 'positive' : 'negative');
  document.getElementById('daily-pnl').textContent = fmt$(totalPnl * 0.12);
  const dpct = (totalPnl * 0.12 / base) * 100;
  document.getElementById('daily-pnl-pct').textContent = fmtPct(dpct);
  document.getElementById('daily-pnl-pct').className = 'stat-change ' + (dpct >= 0 ? 'positive' : 'negative');
  document.getElementById('active-strategies').textContent = running.length;
  const avgWin = running.length ? (running.reduce((a, s) => a + s.winRate, 0) / running.length) : 0;
  document.getElementById('win-rate').textContent = avgWin.toFixed(0) + '%';
  document.getElementById('open-positions').textContent = orders.filter(o => o.status === 'open').length;
  document.getElementById('sharpe-ratio').textContent = (1.2 + totalPnl / base * 5).toFixed(2);
}

// ===== CHARTS =====
const chartDefaults = { 
  responsive: true, 
  maintainAspectRatio: false, 
  plugins: { 
    legend: { display: false } 
  },
  font: { family: 'Inter' }
};
const gridColor = 'rgba(255, 255, 255, 0.05)';
const lineGradient = (ctx, c1, c2) => {
  const g = ctx.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  return g;
};

function initPortfolioChart() {
  const ctx = document.getElementById('portfolioChart').getContext('2d');
  const data = generateEquityCurve(250000, 60);
  const labels = data.map((_, i) => i);
  const gradient = lineGradient(ctx, 'rgba(10, 132, 255, 0.15)', 'rgba(10, 132, 255, 0)');
  portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data, fill: true, backgroundColor: gradient,
        borderColor: '#0a84ff', borderWidth: 2.5, pointRadius: 0,
        tension: 0.3
      }]
    },
    options: { ...chartDefaults, scales: {
      x: { display: false },
      y: { border: { display: false }, grid: { color: gridColor }, ticks: { color: '#8e8e93', font: { family: 'Inter', size: 12 }, callback: v => '$' + (v/1000).toFixed(0) + 'k' } }
    }}
  });
}

function initAllocationChart() {
  const ctx = document.getElementById('allocationChart').getContext('2d');
  allocationChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: strategies.map(s => s.name),
      datasets: [{ 
        data: strategies.map(s => s.capital), 
        backgroundColor: ['#0a84ff', '#5e5ce6', '#30d158', '#ff9f0a', '#ff453a'], 
        borderWidth: 2,
        borderColor: '#1c1c1e', /* Match card bg for clean separation */
        hoverOffset: 4
      }]
    },
    options: { 
      ...chartDefaults, 
      cutout: '80%', 
      plugins: { 
        legend: { 
          display: true, 
          position: 'bottom', 
          labels: { color: '#8e8e93', font: { size: 12, family: 'Inter' }, padding: 16, boxWidth: 8, usePointStyle: true } 
        } 
      } 
    }
  });
}

function initDrawdownChart() {
  const ctx = document.getElementById('drawdownChart').getContext('2d');
  const data = generateDrawdownSeries(60);
  const gradient = lineGradient(ctx, 'rgba(255, 69, 58, 0.1)', 'rgba(255, 69, 58, 0)');
  drawdownChart = new Chart(ctx, {
    type: 'line',
    data: { labels: data.map((_, i) => i), datasets: [{ data, fill: true, backgroundColor: gradient, borderColor: '#ff453a', borderWidth: 2, pointRadius: 0, tension: 0.3 }] },
    options: { ...chartDefaults, scales: { x: { display: false }, y: { border: { display: false }, grid: { color: gridColor }, ticks: { color: '#8e8e93', font: { family: 'Inter', size: 12 }, callback: v => v.toFixed(1) + '%' } } } }
  });
}

function initSectorChart() {
  const ctx = document.getElementById('sectorChart').getContext('2d');
  sectorChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Technology', 'Crypto', 'Consumer', 'Finance', 'ETF'],
      datasets: [{ data: [45, 25, 10, 10, 10], backgroundColor: ['#0a84ff', '#ff9f0a', '#30d158', '#5e5ce6', '#ff453a'], borderWidth: 2, borderColor: '#1c1c1e' }]
    },
    options: { ...chartDefaults, cutout: '80%', plugins: { legend: { display: true, position: 'bottom', labels: { color: '#8e8e93', font: { size: 12 }, padding: 16, boxWidth: 8, usePointStyle: true } } } }
  });
}

// ===== RECENT TRADES =====
function renderRecentTrades() {
  const el = document.getElementById('recent-trades');
  const trades = [
    { sym: 'AAPL', side: 'buy', pnl: 245.30, time: '10:23:04' },
    { sym: 'BTC-USD', side: 'buy', pnl: 1280.00, time: '10:15:22' },
    { sym: 'TSLA', side: 'sell', pnl: -180.50, time: '09:58:11' },
    { sym: 'NVDA', side: 'buy', pnl: 890.20, time: '09:45:30' },
    { sym: 'MSFT', side: 'sell', pnl: 320.10, time: '09:31:44' },
  ];
  el.innerHTML = trades.map(t => `
    <div class="trade-row">
      <div><div class="trade-sym">${t.sym}</div><div class="trade-time">${t.time}</div></div>
      <span class="trade-side ${t.side}">${t.side.toUpperCase()}</span>
      <span class="trade-pnl ${t.pnl >= 0 ? 'pos' : 'neg'}">${fmt$(t.pnl)}</span>
    </div>`).join('');
}

// ===== TOP MOVERS =====
function renderMovers() {
  const el = document.getElementById('top-movers');
  const sorted = [...liveSymbols].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);
  el.innerHTML = sorted.map(s => {
    const cls = s.change >= 0 ? 'up' : 'dn';
    const color = s.change >= 0 ? 'var(--green)' : 'var(--red)';
    return `<div class="mover-row">
      <span class="mover-sym">${s.sym}</span>
      <span class="mover-price">${s.price.toFixed(2)}</span>
      <div class="mover-bar-wrap"><div class="mover-bar" style="width:${Math.min(Math.abs(s.change) * 20, 100)}%;background:${color}"></div></div>
      <span class="mover-chg chg-cell ${cls}">${fmtPct(s.change)}</span>
    </div>`;
  }).join('');
}

// ===== STRATEGIES =====
function renderStrategies() {
  const grid = document.getElementById('strategies-grid');
  grid.innerHTML = strategies.map(s => `
    <div class="strategy-card" data-id="${s.id}">
      <div class="strat-top">
        <div>
          <span class="strat-name">${s.name}</span>
          ${s.type === 'AI Generated' ? '<span class="ai-badge-mini">◈ AI</span>' : ''}
        </div>
        <span class="strat-badge ${s.status}">${s.status.toUpperCase()}</span>
      </div>
      <div class="strat-info">
        <div class="strat-info-item"><div class="si-label">Asset</div><div class="si-val">${s.asset}</div></div>
        <div class="strat-info-item"><div class="si-label">Timeframe</div><div class="si-val">${s.tf}</div></div>
        <div class="strat-info-item"><div class="si-label">P&L</div><div class="si-val" style="color:${s.pnl >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt$(s.pnl)}</div></div>
        <div class="strat-info-item"><div class="si-label">Win Rate</div><div class="si-val">${s.winRate}%</div></div>
        <div class="strat-info-item"><div class="si-label">Capital</div><div class="si-val">${fmt$(s.capital)}</div></div>
        <div class="strat-info-item"><div class="si-label">Trades</div><div class="si-val">${s.trades}</div></div>
      </div>
      <div class="strat-actions">
        <button class="strat-btn" onclick="toggleStrategy(${s.id})">${s.status === 'running' ? '⏸ Pause' : '▶ Start'}</button>
        <button class="strat-btn danger" onclick="removeStrategy(${s.id})">✕ Remove</button>
      </div>
    </div>`).join('');
}

function toggleStrategy(id) {
  const s = strategies.find(x => x.id === id);
  if (s) {
    s.status = s.status === 'running' ? 'paused' : 'running';
    renderStrategies(); updateStats();
    showToast(`Strategy "${s.name}" ${s.status}`);
  }
}

function removeStrategy(id) {
  const s = strategies.find(x => x.id === id);
  strategies = strategies.filter(x => x.id !== id);
  renderStrategies(); updateStats();
  showToast(`Strategy "${s?.name}" removed`, 'error');
}

// ===== STRATEGY MODAL =====
// STRATEGY MODAL TABS
document.querySelectorAll('.strat-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.strat-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.strat-section').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`strat-${tab.dataset.mode}-section`).classList.add('active');
  });
});

// AI GENERATION LOGIC
document.getElementById('ai-generate-strat-btn')?.addEventListener('click', async () => {
  const desc = document.getElementById('strat-ai-desc').value;
  const lang = document.getElementById('strat-ai-lang').value;
  if (!desc) return showToast('Pehle strategy describe kijiye!', 'error');

  const btn = document.getElementById('ai-generate-strat-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> AI is Thinking...';
  btn.disabled = true;

  try {
    const result = await window.ai.generateStrategy(desc, lang);
    
    // Show and fill the Insight Box
    const insightBox = document.getElementById('strat-ai-result-preview');
    const explanationEl = document.getElementById('strat-ai-explanation');
    if (insightBox && explanationEl) {
      explanationEl.textContent = result.explanation;
      insightBox.classList.remove('hidden');
    }

    // Auto-fill fields from AI technical output
    document.getElementById('strat-name').value = result.name;
    document.getElementById('strat-asset').value = result.asset;
    document.getElementById('strat-timeframe').value = result.tf;
    document.getElementById('strat-sl').value = result.sl;
    document.getElementById('strat-tp').value = result.tp;
    
    showToast(`AI: Strategy generated successfully!`, 'info');
    
    // Switch to manual tab to let user review
    document.querySelector('.strat-tab[data-mode="manual"]').click();
  } catch (e) {
    showToast('AI Generation failed: ' + e.message, 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

const stratModal = document.getElementById('strategy-modal');
document.getElementById('create-strategy-btn').addEventListener('click', () => stratModal.classList.add('open'));
document.getElementById('new-strategy-btn').addEventListener('click', () => stratModal.classList.add('open'));
document.getElementById('close-strategy-modal').addEventListener('click', () => stratModal.classList.remove('open'));
document.getElementById('cancel-strategy').addEventListener('click', () => stratModal.classList.remove('open'));
document.getElementById('save-strategy').addEventListener('click', async () => {
  const name = document.getElementById('strat-name').value || 'New Strategy';
  const newStrat = {
    name,
    asset: document.getElementById('strat-asset').value,
    timeframe: document.getElementById('strat-timeframe').value,
    strategy_type: document.getElementById('strat-type').value || 'AI Generated',
    capital: parseInt(document.getElementById('strat-capital').value) || 10000,
    stop_loss: parseFloat(document.getElementById('strat-sl').value) || 2,
    take_profit: parseFloat(document.getElementById('strat-tp').value) || 5,
    status: 'paused'
  };

  // SYNC TO SUPABASE
  if (window.StrategiesDB && window.SessionLib.isLoggedIn()) {
    showToast('Saving to Cloud...', 'info');
    const { data, error } = await window.StrategiesDB.createStrategy(newStrat);
    if (error) {
      showToast('Cloud Save Failed: ' + error.message, 'error');
    } else {
      strategies.push(data);
      showToast(`Strategy "${name}" saved to Cloud!`, 'success');
    }
  } else {
    // Fallback to local memory if not logged in
    newStrat.id = nextStratId++;
    newStrat.pnl = 0; newStrat.trades = 0; newStrat.winRate = 0;
    strategies.push(newStrat);
    showToast(`Strategy "${name}" saved locally (Login to sync)!`);
  }

  renderStrategies(); updateStats();
  updateAIReasoningDropdown();
  stratModal.classList.remove('open');
});

// Load strategies from cloud on login
async function loadUserStrategies() {
  if (window.StrategiesDB && window.SessionLib.isLoggedIn()) {
    const { data, error } = await window.StrategiesDB.getAllStrategies();
    if (!error && data) {
      // Clear and replace local strategies with cloud data
      strategies.length = 0;
      data.forEach(s => {
        // Map database fields to UI fields if necessary
        s.tf = s.timeframe;
        s.pnl = s.pnl || 0;
        s.trades = s.trades || 0;
        s.winRate = s.win_rate || 0;
        strategies.push(s);
      });
      renderStrategies();
      updateStats();
      updateAIReasoningDropdown();
      logger.info(`Loaded ${data.length} strategies from Supabase`);
    }
  }
}

function updateAIReasoningDropdown() {
  const select = document.getElementById('ai-reasoning-target');
  if (!select) return;
  select.innerHTML = '<option value="">Select Strategy to Analyze</option>' + 
    strategies.map(s => `<option value="${s.id}">${s.name} (${s.asset})</option>`).join('');
}

// ===== WATCHLIST =====
function renderWatchlist() {
  const body = document.getElementById('watchlist-body');
  body.innerHTML = liveSymbols.map(s => {
    const cls = s.change >= 0 ? 'up' : 'dn';
    const chgVal = (s.price * s.change / 100);
    return `<tr>
      <td class="sym-cell">${s.sym}</td><td>${s.name}</td>
      <td class="price-cell">${s.price.toFixed(2)}</td>
      <td class="chg-cell ${cls}">${chgVal >= 0 ? '+' : ''}${chgVal.toFixed(2)}</td>
      <td class="chg-cell ${cls}">${fmtPct(s.change)}</td>
      <td>${fmtVol(s.vol)}</td><td>${s.mcap}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="add-watch-btn" onclick="showToast('${s.sym} added to alerts')">+ Alert</button>
          <button class="add-watch-btn" style="background:var(--blue)" onclick="getAISignal('${s.sym}', ${s.price}, ${s.change})">✧ AI</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function getAISignal(sym, price, change) {
  showToast(`AI Consensus for ${sym}...`, 'info');
  const container = document.getElementById('ai-consensus-signals');
  if (!container) return;
  
  // Navigate to AI page
  document.getElementById('nav-ai').click();
  
  container.innerHTML = `<div class="loading-shimmer"></div>`;
  
  try {
    const res = await ai.getConsensusSignal(sym, price, change);
    if (res.error) throw new Error(res.error);
    
    container.innerHTML = `
      <div class="signal-row">
        <span>Step-3.5-Flash</span>
        <span class="signal-tag ${res.model1.toLowerCase().includes('buy') ? 'buy' : 'sell'}">${res.model1}</span>
      </div>
      <div class="signal-row">
        <span>Minimax-M2.7</span>
        <span class="signal-tag ${res.model2.toLowerCase().includes('buy') ? 'buy' : 'sell'}">${res.model2}</span>
      </div>
    `;

    // PERSIST EXPERIENCE TO MEMORY
    ai.storeMarketExperience(sym, price, { price, change, rsi: 55, vol_index: 0.6 }, `Generated AI Signal: ${res.model1}/${res.model2}`);
    setTimeout(updateMemoryStats, 1000); // Refresh stats UI
  } catch (e) {
    container.innerHTML = `<div class="negative">Signal failed: ${e.message}</div>`;
  }
}

document.getElementById('watchlist-search').addEventListener('input', e => {
  const q = e.target.value.toUpperCase();
  document.querySelectorAll('#watchlist-body tr').forEach(tr => {
    tr.style.display = tr.querySelector('.sym-cell').textContent.includes(q) || !q ? '' : 'none';
  });
});

// ===== ORDERS =====
function renderOrders(filter = 'open') {
  const body = document.getElementById('orders-body');
  const filtered = filter === 'open' ? orders.filter(o => o.status === 'open')
    : filter === 'filled' ? orders.filter(o => o.status === 'filled')
    : orders.filter(o => o.status === 'cancelled');
  body.innerHTML = filtered.map((o, i) => `
    <tr>
      <td>${o.time}</td><td class="sym-cell">${o.sym}</td>
      <td><span class="trade-side ${o.side.toLowerCase()}">${o.side}</span></td>
      <td>${o.type}</td><td>${o.qty}</td>
      <td class="price-cell">${o.price.toFixed(2)}</td>
      <td><span class="status-badge ${o.status}">${o.status.toUpperCase()}</span></td>
      <td>${o.strat}</td>
      <td>${o.status === 'open' ? `<button class="cancel-btn" onclick="cancelOrder(${i})">Cancel</button>` : '—'}</td>
    </tr>`).join('');
}

document.querySelectorAll('.order-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderOrders(tab.dataset.tab);
  });
});

function cancelOrder(i) {
  const o = orders.filter(x => x.status === 'open')[i];
  if (o) { o.status = 'cancelled'; renderOrders('open'); showToast(`Order for ${o.sym} cancelled`, 'error'); }
}

// ===== ORDER MODAL =====
const orderModal = document.getElementById('order-modal');
let orderSide = 'BUY';
document.getElementById('manual-order-btn').addEventListener('click', () => orderModal.classList.add('open'));
document.getElementById('close-order-modal').addEventListener('click', () => orderModal.classList.remove('open'));
document.getElementById('cancel-order').addEventListener('click', () => orderModal.classList.remove('open'));
document.querySelectorAll('.side-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    orderSide = btn.dataset.side;
  });
});

document.getElementById('submit-order').addEventListener('click', async () => {
  const sym = document.getElementById('order-symbol').value || 'AAPL';
  const qty = parseInt(document.getElementById('order-qty').value) || 100;
  const price = parseFloat(document.getElementById('order-price').value) || liveSymbols.find(s => s.sym === sym)?.price || 100;
  
  const orderData = {
    sym, side: orderSide, type: document.getElementById('order-type').value,
    qty, price, strat: 'Manual'
  };

  // EXECUTION THROUGH UNIFIED PIPELINE
  showToast('AI Safety Guard Scanning...', 'info');
  
  const result = await window.executionManager.execute({
    symbol: sym,
    side: orderSide,
    qty: qty,
    price: price,
    type: orderData.type,
    strategyId: 'manual'
  });

  if (result.success) {
    showToast(`${orderSide} order submitted for ${sym}`, 'success');
    orderModal.classList.remove('open');
  } else {
    showToast(`Execution Failed: ${result.error}`, 'error');
  }
});

function logAISafety(level, msg) {
  const log = document.getElementById('ai-safety-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = `log-entry ${level}`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.prepend(div);
}

// ===== BACKTEST =====
document.getElementById('run-backtest').addEventListener('click', async () => {
  const btn = document.getElementById('run-backtest');
  btn.innerHTML = '<span class="spinner"></span>Processing...'; btn.disabled = true;
  
  const capital = parseFloat(document.getElementById('bt-capital').value) || 100000;
  
  // Mock history data for simulation
  const mockHistory = Array.from({length: 200}, (_, i) => ({
    timestamp: Date.now() - (200 - i) * 3600000,
    close: 150 + Math.sin(i/10) * 20 + Math.random() * 5
  }));

  // Define strategy for backtest
  const btStrat = {
    name: "Backtest RSI",
    generateSignal: (context) => {
      const last = context[context.length - 1];
      if (last.close < 140) return { symbol: 'AAPL', type: 'BUY', price: last.close, requestedQty: 100 };
      if (last.close > 170) return { symbol: 'AAPL', type: 'SELL', price: last.close, requestedQty: 100 };
      return null;
    },
    checkExit: (pos, current) => {
        if (pos.side === 'BUY' && current.close > pos.entryPrice * 1.05) return true;
        if (pos.side === 'SELL' && current.close < pos.entryPrice * 0.95) return true;
        return false;
    }
  };

  try {
    const results = await window.backtestEngine.run(mockHistory, btStrat);
    
    if (backtestChart) backtestChart.destroy();
    const ctx = document.getElementById('backtestChart').getContext('2d');
    const gradient = lineGradient(ctx, 'rgba(34,211,165,0.25)', 'rgba(34,211,165,0)');
    backtestChart = new Chart(ctx, {
      type: 'line',
      data: { labels: results.equityCurve.map((_, i) => i), datasets: [{ data: results.equityCurve, fill: true, backgroundColor: gradient, borderColor: '#22d3a5', borderWidth: 2, pointRadius: 0, tension: 0.3 }] },
      options: { ...chartDefaults, scales: { x: { display: false }, y: { grid: { color: gridColor }, ticks: { color: '#7b8ab8', font: { family: 'JetBrains Mono', size: 11 }, callback: v => '$' + (v/1000).toFixed(0) + 'k' } } } }
    });

    document.getElementById('bt-return').textContent = results.totalReturn;
    document.getElementById('bt-return').className = 'metric-val ' + (parseFloat(results.totalReturn) >= 0 ? 'positive' : 'negative');
    document.getElementById('bt-drawdown').textContent = results.maxDrawdown;
    document.getElementById('bt-sharpe').textContent = results.sharpeRatio;
    document.getElementById('bt-winrate').textContent = results.winRate;
    document.getElementById('bt-trades').textContent = results.totalTrades;
    document.getElementById('bt-pf').textContent = (Math.random() * 2 + 1).toFixed(2); // Mock PF for now
    
    showToast('Backtest completed with institutional metrics!');
  } catch (e) {
    logger.error("Backtest failed", e);
    showToast('Backtest failed: ' + e.message, 'error');
  } finally {
    btn.textContent = '▶ Run Backtest'; btn.disabled = false;
  }
});

// ===== RISK =====
function renderRiskMeters() {
  const el = document.getElementById('risk-meters');
  const items = [
    { name: 'Portfolio VaR (1d, 95%)', value: '$2,340', pct: 25, level: 'safe' },
    { name: 'Max Drawdown', value: '-8.4%', pct: 42, level: 'warn' },
    { name: 'Leverage Ratio', value: '1.3x', pct: 32, level: 'safe' },
    { name: 'Concentration Risk', value: '38%', pct: 38, level: 'warn' },
    { name: 'Daily Loss Limit', value: '$1,200 / $5,000', pct: 24, level: 'safe' },
    { name: 'Margin Usage', value: '62%', pct: 62, level: 'danger' },
  ];
  el.innerHTML = items.map(i => `
    <div class="risk-item">
      <div class="risk-label-row"><span class="risk-name">${i.name}</span><span class="risk-value">${i.value}</span></div>
      <div class="risk-bar"><div class="risk-fill ${i.level}" style="width:${i.pct}%"></div></div>
    </div>`).join('');
}

document.getElementById('calc-position').addEventListener('click', () => {
  const acc = parseFloat(document.getElementById('ps-account').value);
  const riskPct = parseFloat(document.getElementById('ps-risk').value);
  const entry = parseFloat(document.getElementById('ps-entry').value);
  const stop = parseFloat(document.getElementById('ps-stop').value);
  if (!acc || !riskPct || !entry || !stop || entry === stop) { showToast('Fill all fields', 'error'); return; }
  const riskAmt = acc * riskPct / 100;
  const riskPerShare = Math.abs(entry - stop);
  const shares = Math.floor(riskAmt / riskPerShare);
  const posValue = shares * entry;
  const el = document.getElementById('pos-result');
  el.classList.add('show');
  el.innerHTML = [
    ['Risk Amount', fmt$(riskAmt)], ['Risk Per Share', fmt$(riskPerShare)],
    ['Position Size', shares + ' shares'], ['Position Value', fmt$(posValue)],
    ['% of Account', ((posValue / acc) * 100).toFixed(1) + '%']
  ].map(([l, v]) => `<div class="pos-result-row"><span class="pos-result-label">${l}</span><span class="pos-result-val">${v}</span></div>`).join('');
});

// ===== LIVE UPDATES =====
async function initCore() {
    logger.info("Initializing Core Intelligence OS...");
    
    // Subscribe to events
    window.eventBus.on(window.EVENTS.MARKET_DATA_UPDATE, (data) => {
        const symbol = liveSymbols.find(s => s.sym === data.symbol);
        if (symbol) {
            symbol.price = data.price;
            symbol.change = data.change;
            symbol.vol = data.volume;
            updateTicker();
            renderWatchlist();
            
            // Forward to strategies
            window.strategyController.activeStrategies.forEach(s => s.onMarketUpdate(data));
        }
    });

    window.eventBus.on(window.EVENTS.MARKET_REGIME_CHANGE, (data) => {
        updateRegimeDisplay(data.regime);
    });

    window.eventBus.on(window.EVENTS.PORTFOLIO_UPDATE, (state) => {
        updateStatsFromPortfolio(state);
    });

    // Register Sample Strategy
    class BreakoutStrategy extends StrategyInterface {
        generateSignal(data) {
            // Sample logic: Buy if price change > 2%
            if (data.change > 2) {
                return {
                    symbol: data.symbol,
                    type: 'BUY',
                    price: data.price,
                    stopLoss: data.price * 0.98,
                    takeProfit: data.price * 1.05,
                    requestedQty: 100
                };
            }
            return null;
        }
    }

    const strat = new BreakoutStrategy("Alpha Breakout");
    await window.strategyController.activate(strat);

    await window.marketDataService.init();
}

function updateStatsFromPortfolio(state) {
    document.getElementById('portfolio-value').textContent = fmt$(state.totalValue);
    document.getElementById('portfolio-change').textContent = fmtPct((state.unrealizedPnl / (state.totalValue - state.unrealizedPnl)) * 100);
    document.getElementById('open-positions').textContent = state.positions.length;
}

function updateRegimeDisplay(regime) {
  const el = document.getElementById('market-regime-status');
  if (!el) return;
  el.textContent = regime || 'Ranging';
  el.className = 'status-badge ' + (regime === 'Trending' ? 'filled' : regime === 'Volatile' ? 'cancelled' : 'pending');
}

setInterval(() => { 
    // In a real system, MarketDataService would push updates
    // Here we simulate the push from the service for all subscribed symbols
    liveSymbols.forEach(s => {
        const mockUpdate = {
            price: s.price + (s.price * (Math.random() * 0.002 - 0.001)),
            change: s.change + (Math.random() * 0.2 - 0.1),
            volume: s.vol + Math.floor(Math.random() * 1000)
        };
        window.marketDataService.updatePrice(s.sym, mockUpdate);
    });
}, 3000);
setInterval(updateClock, 1000);

// ===== CHART TAB SWITCHING =====
document.querySelectorAll('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const pts = { '1D': 60, '1W': 120, '1M': 240, '3M': 360 }[tab.dataset.range] || 60;
    const data = generateEquityCurve(250000, pts);
    portfolioChart.data.labels = data.map((_, i) => i);
    portfolioChart.data.datasets[0].data = data;
    portfolioChart.update();
  });
});

// ===== INIT =====
async function init() {
  // Boot Supabase session — non-blocking, failure won't break the app
  if (window.SessionLib) {
    SessionLib.init({
      onSignIn: (user) => {
        logger.info(`Supabase: Signed in as ${user?.email}`);
        // Update UI
        document.getElementById('login-btn')?.classList.add('hidden');
        document.getElementById('user-profile')?.classList.remove('hidden');
        document.getElementById('broker-settings-btn')?.classList.remove('hidden');
        const emailEl = document.getElementById('user-email');
        if (emailEl) emailEl.textContent = user?.email || 'Authenticated';

        // SYNC STRATEGIES FROM CLOUD
        loadUserStrategies();
      },
      onSignOut: () => {
        logger.info('Supabase: User signed out');
        // Update UI
        document.getElementById('login-btn')?.classList.remove('hidden');
        document.getElementById('user-profile')?.classList.add('hidden');
        document.getElementById('broker-settings-btn')?.classList.add('hidden');
      },
    }).catch(e => logger.warn('Session init error:', e));
  }

  await initCore();
  updateClock(); updateTicker(); updateStats();
  
  try { initPortfolioChart(); } catch(e) { console.warn("Portfolio chart failed", e); }
  try { initAllocationChart(); } catch(e) { console.warn("Allocation chart failed", e); }
  try { initDrawdownChart(); } catch(e) { console.warn("Drawdown chart failed", e); }
  try { initSectorChart(); } catch(e) { console.warn("Sector chart failed", e); }
  
  renderRecentTrades(); renderMovers();
  renderStrategies(); renderWatchlist();
  renderOrders(); renderRiskMeters();
  updateAIReasoningDropdown();
  initAIHandlers();
  initAuthHandlers();
  initBrokerHandlers();
  initExecutionHandlers();
  runBootSequence(); // Ensure boot overlay clears
}

function initAuthHandlers() {
  const authBtn = document.getElementById('login-btn');
  const authModal = document.getElementById('auth-modal');
  const closeAuthModal = document.getElementById('close-auth-modal');
  const doLoginBtn = document.getElementById('do-login-btn');
  const doSignupBtn = document.getElementById('do-signup-btn');
  const errorMsg = document.getElementById('auth-error-msg');

  if (!authBtn || !authModal) return;

  authBtn.addEventListener('click', () => {
    authModal.classList.add('open');
    errorMsg.style.display = 'none';
  });

  closeAuthModal?.addEventListener('click', () => {
    authModal.classList.remove('open');
  });

  const handleAuth = async (isSignup) => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
      errorMsg.textContent = 'Please enter both email and password';
      errorMsg.style.display = 'block';
      return;
    }

    const originalText = isSignup ? 'Creating Account...' : 'Logging In...';
    const targetBtn = isSignup ? doSignupBtn : doLoginBtn;
    const btnText = targetBtn.textContent;
    targetBtn.textContent = originalText;
    targetBtn.disabled = true;
    errorMsg.style.display = 'none';

    try {
      const result = isSignup 
        ? await window.AuthLib.signUpWithEmail(email, password)
        : await window.AuthLib.signInWithEmail(email, password);

      if (result.success) {
        if (isSignup) {
          showToast('Account created! Please check your email for confirmation.', 'success');
        }
        authModal.classList.remove('open');
      } else {
        errorMsg.textContent = result.error;
        errorMsg.style.display = 'block';
      }
    } catch (e) {
      errorMsg.textContent = 'Authentication error: ' + e.message;
      errorMsg.style.display = 'block';
    } finally {
      targetBtn.textContent = btnText;
      targetBtn.disabled = false;
    }
  };

  doLoginBtn?.addEventListener('click', () => handleAuth(false));
  doSignupBtn?.addEventListener('click', () => handleAuth(true));
}

// initAIHandlers and initExecutionHandlers are defined fully below

function initBrokerHandlers() {
  const brokerBtn = document.getElementById('broker-settings-btn');
  const brokerModal = document.getElementById('broker-modal');
  const closeBrokerModal = document.getElementById('close-broker-modal');
  const cancelBroker = document.getElementById('cancel-broker');
  const connectBrokerBtn = document.getElementById('connect-broker');
  const brokerStatusMsg = document.getElementById('broker-status-msg');

  if (!brokerBtn) return;

  brokerBtn.addEventListener('click', () => {
    brokerModal.classList.add('open');
  });

  [closeBrokerModal, cancelBroker].forEach(btn => {
    btn?.addEventListener('click', () => {
      brokerModal.classList.remove('open');
    });
  });

  connectBrokerBtn?.addEventListener('click', async () => {
    const clientCode = document.getElementById('broker-client-code').value;
    const password = document.getElementById('broker-password').value;
    const totp = document.getElementById('broker-totp').value;

    if (!clientCode || !password || !totp) {
      showToast('Please enter all credentials', 'error');
      return;
    }

    brokerStatusMsg.style.display = 'block';
    brokerStatusMsg.textContent = 'Connecting to Angel One...';
    brokerStatusMsg.style.color = 'var(--accent)';

    const result = await window.broker.login(clientCode, password, totp);

    if (result.success) {
      brokerStatusMsg.textContent = '✓ Connected Successfully!';
      brokerStatusMsg.style.color = 'var(--green)';
      
      const badge = document.getElementById('broker-connection-badge');
      if (badge) { badge.textContent = 'Broker Connected'; badge.className = 'status-badge filled'; }
      
      showToast('Angel One connected!', 'success');
      
      setTimeout(() => {
        brokerModal.classList.remove('open');
        brokerStatusMsg.style.display = 'none';
      }, 1500);

      // Fetch profile
      const profile = await window.broker.getProfile();
      console.log("Angel One Profile:", profile);
    } else {
      brokerStatusMsg.textContent = 'Error: ' + result.error;
      brokerStatusMsg.style.color = 'var(--red)';
      showToast('Broker connection failed: ' + result.error, 'error');
    }
  });
}

// ===== AI UI HANDLERS =====
function initAIHandlers() {
  document.getElementById('refresh-ai-sentiment')?.addEventListener('click', refreshAISentiment);
  document.getElementById('run-ai-reasoning')?.addEventListener('click', runDeepAnalysis);
  document.getElementById('gen-strat-code')?.addEventListener('click', generateStrategyCode);
  
  // Initial sentiment load
  refreshAISentiment();
  initIntelligenceHandlers();
}

function initIntelligenceHandlers() {
  const searchBtn = document.getElementById('search-historical-memory');
  searchBtn?.addEventListener('click', performHistoricalSearch);
  
  // Initial stats load and periodic refresh
  updateMemoryStats();
  setInterval(updateMemoryStats, 30000);
}

async function updateMemoryStats() {
  const stats = await ai.getMemoryStats();
  if (!stats) return;

  // Update Badge
  const badge = document.getElementById('memory-stats-badge');
  if (badge) badge.textContent = `Memory: ${stats.total_records} Records`;

  // Update Monitor Card
  const totalEl = document.getElementById('stat-total-records');
  const symbolsEl = document.getElementById('stat-total-symbols');
  const syncEl = document.getElementById('stat-last-sync');
  const symListEl = document.getElementById('memory-symbol-list');

  if (totalEl) totalEl.textContent = stats.total_records;
  if (symbolsEl) symbolsEl.textContent = stats.symbols.length;
  if (syncEl && stats.last_sync) {
    const date = new Date(stats.last_sync);
    syncEl.textContent = date.toLocaleTimeString();
  }

  if (symListEl) {
    symListEl.innerHTML = stats.symbols.map(s => `<span class="sym-tag">${s}</span>`).join('');
  }
}

async function performHistoricalSearch() {
  const regime = document.getElementById('memory-regime').value;
  const volatility = document.getElementById('memory-volatility').value;
  const momentum = parseFloat(document.getElementById('memory-momentum').value);
  const resultsEl = document.getElementById('memory-search-results');
  
  resultsEl.innerHTML = '<div class="loading-shimmer"></div><div class="loading-shimmer"></div>';
  
  try {
    const matches = await ai.getHistoricalContext(regime, volatility, momentum);
    
    if (matches.length === 0) {
      resultsEl.innerHTML = '<div class="ai-empty-state">No meaningful historical matches found for this state.</div>';
      return;
    }
    
    resultsEl.innerHTML = matches.map(m => {
      const exp = m.experience;
      const simPct = (m.similarity * 100).toFixed(0);
      const outcomeHtml = exp.outcomes ? `
        <div class="match-outcomes">
          <span class="outcome-tag ${exp.outcomes['1d'] >= 0 ? 'success' : 'fail'}">1D: ${exp.outcomes['1d']}%</span>
          <span class="outcome-tag ${exp.outcomes['3d'] >= 0 ? 'success' : 'fail'}">3D: ${exp.outcomes['3d']}%</span>
          <span class="outcome-tag">DD: ${exp.outcomes.drawdown}%</span>
        </div>
      ` : '<span class="ai-layer-tag">Learning in Progress...</span>';

      return `
        <div class="memory-match-card">
          <div class="match-header">
            <span class="ticker-sym">${exp.symbol}</span>
            <span class="similarity-badge">${simPct}% Similar</span>
          </div>
          <div class="match-observation">${exp.observation}</div>
          ${outcomeHtml}
        </div>
      `;
    }).join('');
    
    showToast(`Retrieved ${matches.length} historical situations.`);
  } catch (e) {
    resultsEl.innerHTML = '<div class="error-msg">Failed to connect to Intelligence Layer.</div>';
  }
}

async function refreshAISentiment() {
  const feed = document.getElementById('ai-sentiment-feed');
  if (!feed) return;
  feed.innerHTML = '<div class="loading-shimmer"></div><div class="loading-shimmer"></div>';
  try {
    const sentiment = await ai.getMarketSentiment();
    const bullets = sentiment.split('\n').filter(l => l.trim().length > 0);
    feed.innerHTML = bullets.map(b => `<div class="sentiment-item">${b.replace(/^[\*\-\d\.]+\s*/, '')}</div>`).join('');
  } catch (e) {
    feed.innerHTML = '<div class="error-msg">Failed to load sentiment data.</div>';
  }
}

async function runDeepAnalysis() {
  const targetId = document.getElementById('ai-reasoning-target').value;
  const output = document.getElementById('ai-reasoning-output');
  if (!targetId || !output) { showToast('Select a strategy', 'error'); return; }
  
  const strat = strategies.find(s => s.id == targetId);
  output.innerHTML = `<span class="console-prompt">> Initializing Deep Analysis for ${strat.name}...</span><br><span class="console-prompt">> Routing to Mistral-Large-3 (675B)...</span><br><span class="loading-shimmer mt-12"></span>`;
  
  try {
    const analysis = await ai.performDeepAnalysis(strat.asset, strat.type);
    output.innerHTML = `<span class="console-prompt">> Analysis Complete for ${strat.asset}:</span><br><br><span class="console-response">${analysis.replace(/\n/g, '<br>')}</span>`;
  } catch (e) {
    output.innerHTML = `<span class="console-prompt">> Error:</span> <span class="negative">${e.message}</span>`;
  }
}

async function generateStrategyCode() {
  const desc = document.getElementById('ai-strat-desc').value;
  if (!desc) { showToast('Describe the strategy first', 'error'); return; }
  
  const btn = document.getElementById('gen-strat-code');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Coding...';
  btn.disabled = true;
  
  try {
    const code = await ai.generateStrategyScript(desc);
    // In a real app we'd show this in a modal or editor, here we'll log it to console and show a toast
    console.log("AI GENERATED CODE:", code);
    showToast('Code generated! Check console for output.', 'success');
    
    // Also show in reasoning console if empty
    const output = document.getElementById('ai-reasoning-output');
    if (output) output.innerHTML = `<span class="console-prompt">> Qwen-3 Coder Result:</span><br><br><pre style="color:#e2e8f0;font-size:11px;">${code}</pre>`;
  } catch (e) {
    showToast('Code generation failed', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ===== INTELLIGENCE OS BOOT SEQUENCE =====
async function runBootSequence() {
  const overlay = document.getElementById('boot-overlay');
  const fill = document.getElementById('boot-fill');
  const status = document.getElementById('boot-status');
  const logs = document.getElementById('boot-logs')?.children;

  if (!overlay || !fill || !status || !logs) {
    console.warn("Boot elements missing, skipping sequence");
    if (overlay) overlay.style.display = 'none';
    return;
  }

  const steps = [
    { p: 25, s: "Loading 21 Consensus Models...", log: 0 },
    { p: 50, s: "Connecting to NVIDIA NIM Cluster...", log: 1 },
    { p: 75, s: "Retrieving Historical Semantic Memories...", log: 2 },
    { p: 100, s: "Classifying Current Market Regime...", log: 3 }
  ];

  for (let i = 0; i < steps.length; i++) {
    try {
        await new Promise(r => setTimeout(r, 600));
        fill.style.width = `${steps[i].p}%`;
        status.textContent = steps[i].s;
        if (logs[steps[i].log]) logs[steps[i].log].classList.add('visible');
    } catch (e) { console.error("Boot step failed", e); }
  }

  await new Promise(r => setTimeout(r, 800));
  overlay.classList.add('fade-out');
  
  // Fallback to ensure it's gone
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 1000);

  showToast('AlgoForge Intelligence OS Online', 'success');
  startAutonomousThinking();
}

// ===== AUTONOMOUS THINKING LOOP =====
function startAutonomousThinking() {
  console.log("Autonomous thinking loop started.");
  setInterval(async () => {
    // Scan watchlist and update rankings
    const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'BTC-USD'];
    const rankings = [];

    for (const sym of symbols) {
      const price = liveSymbols.find(s => s.sym === sym)?.price || 150;
      // Fetch intelligence from backend
      try {
        const res = await fetch(`${API_BASE}/intelligence/think?symbol=${sym}&price=${price}`);
        const result = await res.json();
        rankings.push(result);
      } catch (e) { console.warn("Thinking failed for", sym); }
    }

    renderOpportunityRankings(rankings);
    updateRegimeDisplay();
  }, 30000); // Think every 30s
}

function renderOpportunityRankings(rankings) {
  const container = document.getElementById('top-opportunities');
  if (!container) return;

  if (rankings.length === 0) {
      container.innerHTML = '<div class="ai-empty-state">System scanning for high-confidence setups...</div>';
      return;
  }

  // Sort by confidence
  rankings.sort((a, b) => b.confidence - a.confidence);

  container.innerHTML = rankings.map(r => `
    <div class="opportunity-item">
      <div style="display:flex; align-items:center; gap:12px; flex:1;">
        <div class="stat-value" style="font-size:16px;">${r.symbol}</div>
        <div class="ai-layer-tag" style="background: ${r.risk.color}22; color: ${r.risk.color}; border: 1px solid ${r.risk.color}44; font-size:9px;">${r.risk.tier}</div>
        <div class="ai-layer-tag ${r.signal.toLowerCase()}">${r.signal}</div>
        <div class="stat-label" style="margin:0 0 0 10px; font-size:10px;">${r.reasoning.substring(0, 50)}...</div>
      </div>
      <div style="display:flex; gap:15px; align-items:center;">
        <div style="text-align:right;">
          <div class="stat-label" style="margin:0;">Confidence</div>
          <div class="stat-value" style="font-size:14px; color: var(--accent);">${(r.confidence * 100).toFixed(0)}%</div>
        </div>
        <button class="add-watch-btn" style="background:var(--blue)" onclick="executeAIOpportunity('${r.symbol}', '${r.signal}', ${r.confidence})">Execute</button>
      </div>
    </div>`).join('');
}

async function executeAIOpportunity(symbol, side, confidence) {
    const price = liveSymbols.find(s => s.sym === symbol)?.price || 100;
    showToast(`Executing AI Opportunity for ${symbol}...`, 'info');
    
    await window.executionManager.execute({
        symbol,
        side,
        qty: 100,
        price,
        type: 'MARKET',
        strategyId: 'ai-autonomous'
    });
}

async function updateRegimeDisplay() {
  try {
    const res = await fetch(`${API_BASE}/intelligence/regime`);
    const regime = await res.json();
    document.getElementById('current-regime-display').textContent = regime.type.replace('_', ' ');
    document.getElementById('current-regime-desc').textContent = `System detected ${regime.type} with ${regime.volatility} volatility. Liquidity is ${regime.liquidity}.`;
  } catch (e) {}
}

// ===== CHAT TERMINAL HANDLERS =====
const chatHistory = []; // Stores {role, content} for context

function initChatTerminal() {
  const terminal = document.getElementById('ai-chat-terminal');
  const btnToggle = document.getElementById('toggle-chat-terminal');
  const btnClose = document.getElementById('close-chat-terminal');
  const btnSend = document.getElementById('send-terminal-msg');
  const input = document.getElementById('terminal-input');
  const history = document.getElementById('terminal-history');

  btnToggle?.addEventListener('click', (e) => {
    e.preventDefault();
    terminal.classList.toggle('open');
    if (terminal.classList.contains('open')) input?.focus();
  });
  btnClose?.addEventListener('click', (e) => {
    e.preventDefault();
    terminal.classList.remove('open');
  });

  // Enter key to send
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); btnSend?.click(); }
  });

  btnSend?.addEventListener('click', async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;

    // Add user message to UI
    const userDiv = document.createElement('div');
    userDiv.className = 'terminal-msg user';
    userDiv.textContent = msg;
    history.appendChild(userDiv);
    input.value = '';
    history.scrollTop = history.scrollHeight;

    // Add to conversation history
    chatHistory.push({ role: 'user', content: msg });

    // Show typing indicator
    const aiDiv = document.createElement('div');
    aiDiv.className = 'terminal-msg ai';
    aiDiv.innerHTML = '<span class="spinner"></span> Thinking...';
    history.appendChild(aiDiv);
    history.scrollTop = history.scrollHeight;

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory })
      });
      const data = await response.json();
      aiDiv.innerHTML = '';
      aiDiv.textContent = data.reply;
      chatHistory.push({ role: 'assistant', content: data.reply });
    } catch (e) {
      aiDiv.textContent = "Server se connection nahi ho paya. Please check if server is running.";
    }
    history.scrollTop = history.scrollHeight;
  });
}

// Run boot sequence on load
window.addEventListener('load', () => {
  runBootSequence();
  initChatTerminal();
});

// Update init to include new terminal
const originalInit = init;
init = function() {
  originalInit();
  // Additional Intelligence OS init logic if needed
};

// ===== TRADING EXECUTION HANDLERS =====
function initExecutionHandlers() {
  const btnReview = document.getElementById('btn-review-execute');
  const reviewModal = document.getElementById('execution-review-modal');
  let currentSide = 'BUY';

  // Side Toggle
  document.getElementById('exec-buy')?.addEventListener('click', () => {
    currentSide = 'BUY';
    document.getElementById('exec-buy').classList.add('active');
    document.getElementById('exec-sell').classList.remove('active');
  });
  document.getElementById('exec-sell')?.addEventListener('click', () => {
    currentSide = 'SELL';
    document.getElementById('exec-sell').classList.add('active');
    document.getElementById('exec-buy').classList.remove('active');
  });

  // Review & Execute
  btnReview?.addEventListener('click', async (e) => {
    e.preventDefault();
    const symbol = document.getElementById('exec-symbol').value;
    const qty = parseInt(document.getElementById('exec-qty').value);
    const price = parseFloat(document.getElementById('exec-price').value) || liveSymbols.find(s => s.sym === symbol)?.price;

    if (!symbol || !qty) { showToast('Enter symbol and quantity', 'error'); return; }

    const tradeRequest = { symbol, side: currentSide, qty, price, type: document.getElementById('exec-type').value };

    // 1. Backend Risk Check
    showToast('Risk Engine validating...', 'info');
    try {
      const response = await fetch(`${API_BASE}/execution/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeRequest, portfolio: window.portfolioState || { total_value: 250000, total_exposure: 0 } })
      });
      const result = await response.json();

      if (!result.success) {
        showToast(`Risk Blocked: ${result.error}`, 'error');
        return;
      }

      // 2. Show Review Modal
      const risk = result.riskProfile;
      document.getElementById('review-symbol').textContent = symbol;
      document.getElementById('review-qty').textContent = `${qty} Shares`;
      document.getElementById('review-side-badge').textContent = currentSide;
      document.getElementById('review-side-badge').className = `trade-side ${currentSide.toLowerCase()}`;
      
      // Update Risk Fields
      const tierEl = document.getElementById('review-risk-tier');
      if (tierEl) {
        tierEl.textContent = risk.tier;
        tierEl.style.color = risk.color;
      }
      const scoreEl = document.getElementById('review-risk-score');
      if (scoreEl) scoreEl.textContent = risk.score;
      const styleEl = document.getElementById('review-holding-style');
      if (styleEl) styleEl.textContent = risk.style;
      
      const msgEl = document.getElementById('review-risk-msg');
      if (msgEl) msgEl.textContent = risk.warnings.length > 0 ? risk.warnings[0] : `Exposure within limits. ${risk.factors.liquidity} liquidity detected.`;
      
      const factorsEl = document.getElementById('review-risk-factors');
      if (factorsEl) {
        factorsEl.innerHTML = `
          <span class="ai-layer-tag" style="background:var(--bg-card); border:1px solid var(--border); font-size:10px;">Vol: ${risk.factors.volatility}</span>
          <span class="ai-layer-tag" style="background:var(--bg-card); border:1px solid var(--border); font-size:10px;">Cap: ${risk.factors.marketCap}</span>
        `;
      }

      document.getElementById('review-sl').value = document.getElementById('exec-sl').value || (price * 0.98).toFixed(2);
      document.getElementById('review-tp').value = document.getElementById('exec-tp').value || (price * 1.05).toFixed(2);
      
      reviewModal.classList.add('open');
      window.currentPendingOrder = { ...tradeRequest, id: result.order_id };
    } catch (e) {
      showToast('Execution Service unreachable', 'error');
    }
  });

  // Confirm Execute
  document.getElementById('confirm-execute')?.addEventListener('click', async () => {
    const order = window.currentPendingOrder;
    if (!order) return;

    document.getElementById('confirm-execute').innerHTML = '<span class="spinner"></span> Executing...';
    
    try {
      // 3. Real Broker API Call
      const brokerRes = await window.broker.placeOrder({
        symbol: order.symbol,
        side: order.side,
        qty: order.qty,
        price: order.price,
        type: order.type,
        token: "TOKEN_ID" // Simplified for demo
      });

      if (brokerRes.status) {
        showToast('Broker: Order Placed Successfully!', 'success');
        
        // 4. Notify Backend of Fill
        await fetch(`${API_BASE}/execution/update-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            status: 'FILLED',
            execution_price: order.price,
            broker_order_id: brokerRes.data.orderid
          })
        });

        reviewModal.classList.remove('open');
        syncPortfolio();
      } else {
        showToast(`Broker Error: ${brokerRes.message}`, 'error');
      }
    } catch (e) {
      showToast('Broker connectivity lost', 'error');
    } finally {
      document.getElementById('confirm-execute').textContent = '✔ Confirm & Execute Order';
    }
  });

  [document.getElementById('close-review-modal'), document.getElementById('cancel-execution')].forEach(b => {
    b?.addEventListener('click', () => reviewModal.classList.remove('open'));
  });

  // Initial Sync
  syncPortfolio();
  setInterval(syncPortfolio, 10000); // Sync every 10s
}

async function syncPortfolio() {
  try {
    const res = await fetch(`${API_BASE}/portfolio/state`);
    const state = await res.json();
    window.portfolioState = state.stats;
    renderActivePositions(state.positions);
    updateExecutionBadge();
  } catch (e) {
    console.warn("Portfolio sync failed");
  }
}

function renderActivePositions(positions) {
  const body = document.getElementById('active-positions-body');
  if (!body) return;

  if (positions.length === 0) {
    body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;">No open positions.</td></tr>';
    return;
  }

  body.innerHTML = positions.map(p => {
    const ltp = liveSymbols.find(s => s.sym === p.symbol)?.price || p.entry_price;
    const pnl = (ltp - p.entry_price) * p.qty * (p.side === 'BUY' ? 1 : -1);
    const pnlCls = pnl >= 0 ? 'positive' : 'negative';

    return `<tr>
      <td class="sym-cell">${p.symbol}</td>
      <td>${p.qty}</td>
      <td class="price-cell">${p.entry_price.toFixed(2)}</td>
      <td class="price-cell">${ltp.toFixed(2)}</td>
      <td class="chg-cell ${pnlCls}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</td>
      <td><span class="status-badge filled">ACTIVE</span></td>
      <td style="font-size:11px;">SL: ${p.sl_price || '—'}<br>TP: ${p.tp_price || '—'}</td>
      <td><button class="cancel-btn" onclick="closePosition('${p.symbol}')">Close</button></td>
    </tr>`;
  }).join('');
}

function updateExecutionBadge() {
  const badge = document.getElementById('broker-connection-badge');
  if (!badge) return;
  if (window.broker.isConnected()) {
    badge.textContent = 'Broker Connected';
    badge.className = 'status-badge filled';
  } else {
    badge.textContent = 'Disconnected';
    badge.className = 'status-badge cancelled';
  }
}

// ===== DEMO SIGNAL GENERATOR =====
document.getElementById('demo-signal-btn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const status = document.getElementById('demo-thinking-status');
  status.style.display = 'flex';
  
  try {
    // 1. Force the Orchestrator to think about NVDA
    const res = await fetch(`${API_BASE}/intelligence/think?symbol=NVDA&price=880.50`);
    const result = await res.json();
    
    setTimeout(() => {
      status.style.display = 'none';
      
      // Populate the Execution Panel automatically
      document.getElementById('exec-symbol').value = 'NVDA';
      document.getElementById('exec-qty').value = '10';
      document.getElementById('exec-type').value = 'LIMIT';
      document.getElementById('exec-price').value = '880.50';
      document.getElementById('exec-sl').value = '860.00';
      document.getElementById('exec-tp').value = '950.00';
      
      // Trigger the Review Flow
      document.getElementById('btn-review-execute').click();
      
      showToast('AI Signal Generated: NVDA Bullish Breakout', 'success');
    }, 1500);
  } catch (e) {
    status.style.display = 'none';
    showToast('Failed to connect to Intelligence Core', 'error');
  }
});

// Helper to review an autonomous opportunity
window.reviewOpportunity = (symbol) => {
  const input = document.getElementById('exec-symbol');
  if (input) {
    input.value = symbol;
    document.getElementById('btn-review-execute')?.click();
  }
};

init();
