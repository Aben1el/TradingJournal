// Dashboard Module

class Dashboard {
    constructor() {
        this.currentFilter = 'all';
        this.charts = {};
        this.analyticsCharts = {};
        this.viewMonth = getMonthKey(new Date());
        this._bindMonthNav();
    }

    setFilter(f) { this.currentFilter = f; this.loadDashboard(); }

    _bindMonthNav() {
        const prev = document.getElementById('prevMonthBtn');
        const next = document.getElementById('nextMonthBtn');
        if (prev) prev.addEventListener('click', () => { this.viewMonth = shiftMonthKey(this.viewMonth, -1); this._refreshMonthly(); });
        if (next) next.addEventListener('click', () => { this.viewMonth = shiftMonthKey(this.viewMonth, 1); this._refreshMonthly(); });
    }

    async loadDashboard() {
        const trades = await db.getAllTrades();
        const filtered = analytics.filterTradesByDate(trades, this.currentFilter);
        this.renderGreeting();
        this.renderToday(trades);
        this.renderStats(filtered);
        this.renderMonthly(trades);
        this.renderRecent(trades);
        this.renderInsights(trades);
        this.renderCharts(filtered);
    }

    renderGreeting() {
        const el = document.getElementById('greetingTitle');
        if (el) el.textContent = `${getGreeting()}, ${localStorage.getItem('tv_name') || 'Trader'}`;
    }

    renderToday(trades) {
        const el = document.getElementById('todayGrid');
        if (!el) return;
        const s = analytics.getTodayStats(trades);
        const starting = parseFloat(localStorage.getItem('tv_starting_balance')) || 10000;
        el.innerHTML = `
            <div class="today-card">
                <div class="today-label">Today's P&L</div>
                <div class="today-value ${s.todayPL >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(s.todayPL)}</div>
                <div class="today-sub">${s.todayTrades} ${s.todayTrades === 1 ? 'trade' : 'trades'} today</div>
            </div>
            <div class="today-card">
                <div class="today-label">Current Balance</div>
                <div class="today-value">${formatCurrency(s.currentBalance)}</div>
                <div class="today-sub">Starting: ${formatCurrency(starting)}</div>
            </div>
            <div class="today-card">
                <div class="today-label">Total P&L</div>
                <div class="today-value ${s.totalPL >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(s.totalPL)}</div>
                <div class="today-sub">All time</div>
            </div>
            <div class="today-card">
                <div class="today-label">Trading Streak</div>
                <div class="today-value ${s.streak.type === 'win' ? 'text-success' : s.streak.type === 'loss' ? 'text-danger' : ''}">${s.streak.count}${s.streak.type !== 'none' ? ' ' + s.streak.type + 's' : ''}</div>
                <div class="today-sub">Current streak</div>
            </div>`;
    }

    renderStats(trades) {
        const el = document.getElementById('statsGrid');
        if (!el) return;
        if (!trades || trades.length === 0) {
            el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
                <h3>No trades yet</h3>
                <p>Start building your trading history and your performance insights will appear here.</p>
                <button class="btn btn-primary" onclick="trades.showTradeModal()">+ Add Your First Trade</button>
            </div>`;
            return;
        }
        const s = analytics.calculateStats(trades);
        const pf = s.profitFactor === Infinity ? '∞' : formatNumber(s.profitFactor, 2);
        el.innerHTML = `
            <div class="stat-card"><div class="stat-label">Total Trades</div><div class="stat-value">${s.totalTrades}</div></div>
            <div class="stat-card"><div class="stat-label">Win Rate</div><div class="stat-value text-success">${formatPercentage(s.winRate)}</div></div>
            <div class="stat-card"><div class="stat-label">Loss Rate</div><div class="stat-value text-danger">${formatPercentage(s.lossRate)}</div></div>
            <div class="stat-card"><div class="stat-label">Net P/L</div><div class="stat-value ${s.netPL >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(s.netPL)}</div></div>
            <div class="stat-card"><div class="stat-label">Profit Factor</div><div class="stat-value">${pf}</div></div>
            <div class="stat-card"><div class="stat-label">Expectancy</div><div class="stat-value ${s.expectancy >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(s.expectancy)}</div></div>
            <div class="stat-card"><div class="stat-label">Average R</div><div class="stat-value">${formatNumber(s.averageRR, 2)}R</div></div>
            <div class="stat-card"><div class="stat-label">Best Trade</div><div class="stat-value text-success">${formatCurrency(s.bestTrade)}</div></div>
            <div class="stat-card"><div class="stat-label">Worst Trade</div><div class="stat-value text-danger">${formatCurrency(s.worstTrade)}</div></div>
            <div class="stat-card"><div class="stat-label">Average Win</div><div class="stat-value text-success">${formatCurrency(s.averageWin)}</div></div>
            <div class="stat-card"><div class="stat-label">Average Loss</div><div class="stat-value text-danger">${formatCurrency(Math.abs(s.averageLoss))}</div></div>
            <div class="stat-card"><div class="stat-label">Max Drawdown</div><div class="stat-value text-danger">${formatCurrency(s.maxDrawdown)}</div></div>`;
    }

    renderMonthly(trades) {
        this._trades = trades;
        this._refreshMonthly();
    }

    _refreshMonthly() {
        const label = document.getElementById('monthLabel');
        const grid = document.getElementById('monthlyGrid');
        const nextBtn = document.getElementById('nextMonthBtn');
        if (!label || !grid) return;
        label.textContent = formatMonthKey(this.viewMonth);
        if (nextBtn) nextBtn.disabled = this.viewMonth >= getMonthKey(new Date());
        const m = analytics.getMonthlyDetail(this._trades || [], this.viewMonth);
        if (m.trades === 0) {
            grid.innerHTML = `<div class="monthly-item" style="grid-column:1/-1;"><div class="m-label">No trades recorded in this month</div></div>`;
            return;
        }
        grid.innerHTML = `
            <div class="monthly-item"><div class="m-label">Monthly P&L</div><div class="m-value ${m.pl >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(m.pl)}</div></div>
            <div class="monthly-item"><div class="m-label">Trades</div><div class="m-value">${m.trades}</div></div>
            <div class="monthly-item"><div class="m-label">Win Rate</div><div class="m-value">${formatPercentage(m.winRate)}</div></div>
            <div class="monthly-item"><div class="m-label">Biggest Win</div><div class="m-value text-success">${formatCurrency(m.biggestWin)}</div></div>
            <div class="monthly-item"><div class="m-label">Biggest Loss</div><div class="m-value text-danger">${formatCurrency(m.biggestLoss)}</div></div>
            <div class="monthly-item"><div class="m-label">Best Day</div><div class="m-value text-success">${m.bestDay ? formatDate(m.bestDay.k) : '—'}</div></div>
            <div class="monthly-item"><div class="m-label">Worst Day</div><div class="m-value text-danger">${m.worstDay ? formatDate(m.worstDay.k) : '—'}</div></div>`;
    }

    renderRecent(trades) {
        const el = document.getElementById('recentTradesList');
        if (!el) return;
        if (!trades || trades.length === 0) {
            el.innerHTML = `<div class="empty-state">
                <h3>No trades yet</h3>
                <p>Start building your trading history and your performance insights will appear here.</p>
                <button class="btn btn-primary" onclick="trades.showTradeModal()">+ Add Your First Trade</button>
            </div>`;
            return;
        }
        const recent = [...trades].sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate)).slice(0, 5);
        el.innerHTML = recent.map(t => `
            <div class="recent-row" onclick="trades.showTradeDetail(${t.id})">
                <div class="recent-left">
                    <span class="badge ${t.direction === 'long' ? 'badge-success' : 'badge-danger'}">${t.direction || 'N/A'}</span>
                    <div>
                        <div class="recent-symbol">${t.symbol || 'Unknown'}</div>
                        <div class="recent-meta">${formatDate(t.entryDate)} · ${t.strategy || 'No strategy'} · ${formatNumber(t.rMultiple, 2)}R</div>
                    </div>
                </div>
                <div class="recent-pl ${t.profitLoss >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(t.profitLoss)}</div>
            </div>`).join('');
        const viewAll = document.getElementById('viewAllTradesBtn');
        if (viewAll) viewAll.onclick = () => app.navigateTo('trades');
    }

    renderInsights(trades) {
        const el = document.getElementById('smartInsights');
        if (!el) return;
        const insights = analytics.getSmartInsights(trades);
        el.innerHTML = insights.map(i => `<div class="smart-insight ${i.type}">${i.text}</div>`).join('');
    }

    _tooltip() {
        return { backgroundColor: 'rgba(26,26,26,0.95)', titleColor: '#fff', bodyColor: '#fff', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12 };
    }

    renderCharts(trades) {
        Object.values(this.charts).forEach(c => c && c.destroy());
        this.charts = {};
        if (!trades || trades.length === 0) return;

        // Equity Curve
        const eq = document.getElementById('equityChart');
        if (eq) {
            const ctx = eq.getContext('2d');
            const { labels, data } = analytics.getEquityCurveData(trades);
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(99,102,241,0.3)');
            gradient.addColorStop(1, 'rgba(99,102,241,0)');
            this.charts.equity = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets: [{ data, borderColor: '#6366f1', backgroundColor: gradient, borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { ...this._tooltip(), callbacks: { label: c => formatCurrency(c.parsed.y) } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', maxTicksLimit: 8 } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } } } }
            });
        }

        // Win/Loss
        const wl = document.getElementById('winLossChart');
        if (wl) {
            const d = analytics.getWinLossDistribution(trades);
            this.charts.wl = new Chart(wl.getContext('2d'), { type: 'doughnut', data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: d.colors, borderColor: '#1a1a1a', borderWidth: 3 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#a0a0a0', usePointStyle: true } }, tooltip: this._tooltip() } } });
        }

        // Strategy
        const st = document.getElementById('strategyChart');
        if (st) {
            const d = analytics.getPerformanceByStrategy(trades);
            this.charts.st = new Chart(st.getContext('2d'), { type: 'bar', data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: d.colors, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...this._tooltip(), callbacks: { label: c => formatCurrency(c.parsed.y) } } }, scales: { x: { grid: { display: false }, ticks: { color: '#a0a0a0' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } } } } });
        }

        // Day of week
        const dw = document.getElementById('dayOfWeekChart');
        if (dw) {
            const d = analytics.getProfitByDayOfWeek(trades);
            this.charts.dw = new Chart(dw.getContext('2d'), { type: 'bar', data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: d.colors, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...this._tooltip(), callbacks: { label: c => formatCurrency(c.parsed.y) } } }, scales: { x: { grid: { display: false }, ticks: { color: '#a0a0a0' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } } } } });
        }

        // Long vs Short
        const ls = document.getElementById('longShortChart');
        if (ls) {
            const d = analytics.getLongVsShortPerformance(trades);
            this.charts.ls = new Chart(ls.getContext('2d'), { type: 'bar', data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: d.colors, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { ...this._tooltip(), callbacks: { label: c => formatCurrency(c.parsed.x) } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } }, y: { grid: { display: false }, ticks: { color: '#a0a0a0' } } } } });
        }
    }

    // Analytics page charts (previously dead canvases — now live)
    async loadAnalytics() {
        const trades = await db.getAllTrades();
        Object.values(this.analyticsCharts).forEach(c => c && c.destroy());
        this.analyticsCharts = {};
        if (!trades || trades.length === 0) return;

        const mo = document.getElementById('monthlyChart');
        if (mo) {
            const d = analytics.getMonthlyPerformance(trades);
            this.analyticsCharts.mo = new Chart(mo.getContext('2d'), { type: 'bar', data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: d.colors, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...this._tooltip(), callbacks: { label: c => formatCurrency(c.parsed.y) } } }, scales: { x: { grid: { display: false }, ticks: { color: '#a0a0a0' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } } } } });
        }

        const dp = document.getElementById('dailyPLChart');
        if (dp) {
            const d = analytics.getDailyPL(trades);
            this.analyticsCharts.dp = new Chart(dp.getContext('2d'), { type: 'bar', data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: d.colors, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...this._tooltip(), callbacks: { label: c => formatCurrency(c.parsed.y) } } }, scales: { x: { grid: { display: false }, ticks: { color: '#a0a0a0', maxTicksLimit: 10 } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } } } } });
        }

        const se = document.getElementById('sessionChart');
        if (se) {
            const d = analytics.getPerformanceBySession(trades);
            this.analyticsCharts.se = new Chart(se.getContext('2d'), { type: 'bar', data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: d.colors, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...this._tooltip(), callbacks: { label: c => formatCurrency(c.parsed.y) } } }, scales: { x: { grid: { display: false }, ticks: { color: '#a0a0a0' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } } } } });
        }

        const rr = document.getElementById('rrDistributionChart');
        if (rr) {
            const d = analytics.getRRDistribution(trades);
            this.analyticsCharts.rr = new Chart(rr.getContext('2d'), { type: 'bar', data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: d.colors, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: this._tooltip() }, scales: { x: { grid: { display: false }, ticks: { color: '#a0a0a0' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', precision: 0 } } } } });
        }
    }
}

const dashboard = new Dashboard();
