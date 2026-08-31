// Dashboard Module — professional chart system v2

const CHART_COLORS = {
    green: '#2ebd85',
    red: '#e5536b',
    gray: '#5b5b66',
    accent: '#7c7ff2',
    indigo: ['#7c7ff2', '#9aa0f5', '#6f74e8', '#8b5cf6', '#a78bfa', '#5f64d6']
};

// Draws win-rate % in the middle of the doughnut
const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
        if (chart.config.type !== 'doughnut') return;
        const meta = chart.getDatasetMeta(0);
        if (!meta.data.length) return;
        const { ctx } = chart;
        const x = meta.data[0].x, y = meta.data[0].y;
        const data = chart.data.datasets[0].data;
        const total = data.reduce((a, b) => a + b, 0);
        const pct = total ? Math.round(((data[0] || 0) / total) * 100) : 0;
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = "800 22px Inter, sans-serif"; ctx.fillStyle = '#ffffff';
        ctx.fillText(pct + '%', x, y - 8);
        ctx.font = "600 9px Inter, sans-serif"; ctx.fillStyle = '#8a8a93';
        ctx.fillText('WIN RATE', x, y + 12);
        ctx.restore();
    }
};

class Dashboard {
    constructor() {
        this.currentFilter = 'all';
        this.charts = {};
        this.analyticsCharts = {};
        this.viewMonth = getMonthKey(new Date());

        Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
        Chart.defaults.color = '#8a8a93';
        Chart.defaults.animation.duration = 900;
        Chart.defaults.animation.easing = 'easeOutQuart';

        this._bindMonthNav();
    }

    setFilter(f) { this.currentFilter = f; this.loadDashboard(); }

    _bindMonthNav() {
        const prev = document.getElementById('prevMonthBtn');
        const next = document.getElementById('nextMonthBtn');
        if (prev) prev.onclick = () => { this.viewMonth = shiftMonthKey(this.viewMonth, -1); this._refreshMonthly(); };
        if (next) next.onclick = () => { this.viewMonth = shiftMonthKey(this.viewMonth, 1); this._refreshMonthly(); };
    }

    // ---------- shared chart helpers ----------
    _tooltip(money = true, horizontal = false) {
        return {
            backgroundColor: 'rgba(18, 18, 22, 0.95)',
            titleColor: '#ffffff', bodyColor: '#c9c9d1',
            borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1,
            padding: 12, cornerRadius: 10, displayColors: false,
            titleFont: { size: 12, weight: '600' }, bodyFont: { size: 12 },
            callbacks: money ? { label: c => ' ' + formatCurrency(horizontal ? c.parsed.x : c.parsed.y) } : {}
        };
    }

    _bar(ctx, { labels, data, colors, horizontal = false, money = true, allLabels = false }) {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data, backgroundColor: colors,
                    borderRadius: 8, borderSkipped: false,
                    maxBarThickness: horizontal ? 34 : 46,
                    categoryPercentage: 0.7, barPercentage: 0.9
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                indexAxis: horizontal ? 'y' : 'x',
                plugins: { legend: { display: false }, tooltip: this._tooltip(money, horizontal) },
                scales: horizontal ? {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false }, ticks: { color: '#8a8a93', font: { size: 10 }, callback: v => '$' + v, maxTicksLimit: 6 } },
                    y: { grid: { display: false }, border: { display: false }, ticks: { color: '#a0a0a8', font: { size: 11 } } }
                } : {
                    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8a8a93', font: { size: 10 }, maxRotation: 0, autoSkip: !allLabels } },
                    y: { grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false }, ticks: { color: '#8a8a93', font: { size: 10 }, maxTicksLimit: 5, callback: v => '$' + v } }
                }
            }
        });
    }

    _signColors(values) { return values.map(v => v >= 0 ? CHART_COLORS.green : CHART_COLORS.red); }

    // ---------- page rendering ----------
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
            <div class="today-card"><div class="today-label">Today's P&L</div><div class="today-value ${s.todayPL >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(s.todayPL)}</div><div class="today-sub">${s.todayTrades} ${s.todayTrades === 1 ? 'trade' : 'trades'} today</div></div>
            <div class="today-card"><div class="today-label">Current Balance</div><div class="today-value">${formatCurrency(s.currentBalance)}</div><div class="today-sub">Starting: ${formatCurrency(starting)}</div></div>
            <div class="today-card"><div class="today-label">Total P&L</div><div class="today-value ${s.totalPL >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(s.totalPL)}</div><div class="today-sub">All time</div></div>
            <div class="today-card"><div class="today-label">Trading Streak</div><div class="today-value ${s.streak.type === 'win' ? 'text-success' : s.streak.type === 'loss' ? 'text-danger' : ''}">${s.streak.count}${s.streak.type !== 'none' ? ' ' + s.streak.type + 's' : ''}</div><div class="today-sub">Current streak</div></div>`;
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

    renderMonthly(trades) { this._trades = trades; this._refreshMonthly(); }

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
        el.innerHTML = analytics.getSmartInsights(trades).map(i => `<div class="smart-insight ${i.type}">${i.text}</div>`).join('');
    }

    // ---------- DASHBOARD CHARTS ----------
    renderCharts(trades) {
        Object.values(this.charts).forEach(c => c && c.destroy());
        this.charts = {};
        if (!trades || trades.length === 0) return;

        const eq = document.getElementById('equityChart');
        if (eq) {
            const ctx = eq.getContext('2d');
            const { labels, data } = analytics.getEquityCurveData(trades);
            const gradient = ctx.createLinearGradient(0, 0, 0, 380);
            gradient.addColorStop(0, 'rgba(124, 127, 242, 0.25)');
            gradient.addColorStop(1, 'rgba(124, 127, 242, 0)');
            this.charts.equity = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets: [{ data, borderColor: CHART_COLORS.accent, backgroundColor: gradient, borderWidth: 2.5, fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: CHART_COLORS.accent, pointHoverBorderColor: '#fff' }] },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' },
                    plugins: { legend: { display: false }, tooltip: this._tooltip() },
                    scales: {
                        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8a8a93', font: { size: 10 }, maxTicksLimit: 6, maxRotation: 0 } },
                        y: { grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false }, ticks: { color: '#8a8a93', font: { size: 10 }, maxTicksLimit: 5, callback: v => '$' + v } }
                    }
                }
            });
        }

        const wl = document.getElementById('winLossChart');
        if (wl) {
            const d = analytics.getWinLossDistribution(trades);
            this.charts.wl = new Chart(wl.getContext('2d'), {
                type: 'doughnut',
                data: { labels: d.labels, datasets: [{ data: d.data, backgroundColor: [CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.gray], borderWidth: 0, borderRadius: 6, spacing: 2, hoverOffset: 8 }] },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '76%',
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 6, boxHeight: 6, padding: 16, color: '#a0a0a8', font: { size: 11 } } },
                        tooltip: { ...this._tooltip(false), callbacks: { label: c => ` ${c.label}: ${c.parsed} trades` } }
                    }
                },
                plugins: [centerTextPlugin]
            });
        }

        const st = document.getElementById('strategyChart');
        if (st) {
            const d = analytics.getPerformanceByStrategy(trades);
            this.charts.st = this._bar(st.getContext('2d'), { labels: d.labels, data: d.data, colors: d.data.map((_, i) => CHART_COLORS.indigo[i % CHART_COLORS.indigo.length]) });
        }

        const dw = document.getElementById('dayOfWeekChart');
        if (dw) {
            const d = analytics.getProfitByDayOfWeek(trades);
            this.charts.dw = this._bar(dw.getContext('2d'), { labels: d.labels, data: d.data, colors: this._signColors(d.data), allLabels: true });
        }

        const ls = document.getElementById('longShortChart');
        if (ls) {
            const d = analytics.getLongVsShortPerformance(trades);
            this.charts.ls = this._bar(ls.getContext('2d'), { labels: d.labels, data: d.data, colors: this._signColors(d.data), horizontal: true });
        }
    }

    // ---------- ANALYTICS PAGE CHARTS ----------
    async loadAnalytics() {
        const trades = await db.getAllTrades();
        Object.values(this.analyticsCharts).forEach(c => c && c.destroy());
        this.analyticsCharts = {};
        if (!trades || trades.length === 0) return;

        const mo = document.getElementById('monthlyChart');
        if (mo) {
            const d = analytics.getMonthlyPerformance(trades);
            this.analyticsCharts.mo = this._bar(mo.getContext('2d'), { labels: d.labels, data: d.data, colors: this._signColors(d.data) });
        }
        const dp = document.getElementById('dailyPLChart');
        if (dp) {
            const d = analytics.getDailyPL(trades);
            this.analyticsCharts.dp = this._bar(dp.getContext('2d'), { labels: d.labels, data: d.data, colors: this._signColors(d.data) });
        }
        const se = document.getElementById('sessionChart');
        if (se) {
            const d = analytics.getPerformanceBySession(trades);
            this.analyticsCharts.se = this._bar(se.getContext('2d'), { labels: d.labels, data: d.data, colors: d.data.map((_, i) => CHART_COLORS.indigo[i % CHART_COLORS.indigo.length]) });
        }
        const rr = document.getElementById('rrDistributionChart');
        if (rr) {
            const d = analytics.getRRDistribution(trades);
            this.analyticsCharts.rr = this._bar(rr.getContext('2d'), {
                labels: d.labels, data: d.data, colors: CHART_COLORS.accent, money: false,
                allLabels: true
            });
            // custom tooltip for counts
            this.analyticsCharts.rr.options.plugins.tooltip.callbacks = { label: c => ` ${c.parsed.y} trades` };
        }
    }
}

const dashboard = new Dashboard();
