// Dashboard Module

class Dashboard {
    constructor() {
        this.currentFilter = 'all';
        this.charts = {};
    }

    async loadDashboard() {
        try {
            const trades = await db.getAllTrades();
            const filteredTrades = analytics.filterTradesByDate(trades, this.currentFilter);

            this.renderStats(filteredTrades);
            this.renderCharts(filteredTrades);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.loadDashboard();
    }

    renderStats(trades) {
        const stats = analytics.calculateStats(trades, 'all');
        const statsGrid = document.getElementById('statsGrid');

        if (trades.length === 0) {
            statsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="20" x2="12" y2="10"/>
                            <line x1="18" y1="20" x2="18" y2="4"/>
                            <line x1="6" y1="20" x2="6" y2="16"/>
                        </svg>
                    </div>
                    <h3>Your trading journey starts here</h3>
                    <p>Start tracking your trades to see your performance</p>
                    <button class="btn btn-primary" onclick="app.navigateTo('journal')">
                        Add Your First Trade
                    </button>
                </div>
            `;
            return;
        }

        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Total Trades</div>
                <div class="stat-value">${stats.totalTrades}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Win Rate</div>
                <div class="stat-value">${formatPercentage(stats.winRate)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Net P/L</div>
                <div class="stat-value ${stats.netPL >= 0 ? 'text-success' : 'text-danger'}">
                    ${formatCurrency(stats.netPL)}
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Profit Factor</div>
                <div class="stat-value">${stats.profitFactor === Infinity ? '∞' : formatNumber(stats.profitFactor, 2)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average R:R</div>
                <div class="stat-value">${formatNumber(stats.averageRR, 2)}R</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average Win</div>
                <div class="stat-value text-success">${formatCurrency(stats.averageWin)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average Loss</div>
                <div class="stat-value text-danger">${formatCurrency(Math.abs(stats.averageLoss))}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Current Streak</div>
                <div class="stat-value ${stats.currentStreak.type === 'win' ? 'text-success' : 'text-danger'}">
                    ${stats.currentStreak.count} ${stats.currentStreak.type}s
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Max Drawdown</div>
                <div class="stat-value text-danger">${formatCurrency(stats.maxDrawdown)}</div>
            </div>
        `;
    }

    renderCharts(trades) {
        this.destroyCharts();
        if (trades.length === 0) return;

        this.renderEquityCurve(trades);
        this.renderWinLossChart(trades);
        this.renderStrategyChart(trades);
        this.renderDayOfWeekChart(trades);
        this.renderLongShortChart(trades);
    }

    renderEquityCurve(trades) {
        const canvas = document.getElementById('equityChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { labels, data } = analytics.getEquityCurveData(trades);

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        this.charts.equity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Equity',
                    data: data,
                    borderColor: '#6366f1',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', maxTicksLimit: 8 } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } }
                }
            }
        });
    }

    renderWinLossChart(trades) {
        const canvas = document.getElementById('winLossChart');
        if (!canvas) return;
        const { labels, data, colors } = analytics.getWinLossDistribution(trades);

        this.charts.winLoss = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#1a1a1a', borderWidth: 3 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: { legend: { position: 'bottom', labels: { color: '#a0a0a0', usePointStyle: true } } }
            }
        });
    }

    renderStrategyChart(trades) {
        const canvas = document.getElementById('strategyChart');
        if (!canvas) return;
        const { labels, data, colors } = analytics.getPerformanceByStrategy(trades);

        this.charts.strategy = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#a0a0a0' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } }
                }
            }
        });
    }

    renderDayOfWeekChart(trades) {
        const canvas = document.getElementById('dayOfWeekChart');
        if (!canvas) return;
        const { labels, data, colors } = analytics.getProfitByDayOfWeek(trades);

        this.charts.dayOfWeek = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#a0a0a0' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } }
                }
            }
        });
    }

    renderLongShortChart(trades) {
        const canvas = document.getElementById('longShortChart');
        if (!canvas) return;
        const { labels, data, colors } = analytics.getLongVsShortPerformance(trades);

        this.charts.longShort = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0', callback: v => '$' + v } },
                    y: { grid: { display: false }, ticks: { color: '#a0a0a0' } }
                }
            }
        });
    }

    destroyCharts() {
        Object.values(this.charts).forEach(c => c && c.destroy());
        this.charts = {};
    }
}

const dashboard = new Dashboard();