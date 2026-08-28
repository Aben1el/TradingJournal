// ============ TradeVault Funded Dashboard ============
(function () {
    async function activeAccount() {
        const id = localStorage.getItem('tv_active_account_id');
        if (!id || !window.tvClient) return null;
        const { data } = await tvClient.from('trading_accounts').select('*').eq('id', id).single();
        return data || null;
    }

    async function renderFunded() {
        const dash = document.getElementById('dashboard');
        if (!dash || !window.db) return;
        let panel = document.getElementById('fundedPanel');
        const acc = await activeAccount();

        if (!acc || acc.type !== 'funded') {
            if (panel) panel.innerHTML = '';
            return;
        }
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'fundedPanel';
            dash.querySelector('.dash-header').after(panel);
        }

        const trades = await db.getAllTrades();

        // ---- real calculations from this account's trades ----
        const net = trades.reduce((s, t) => s + (t.profitLoss || 0), 0);
        const balance = (acc.starting_balance || 0) + net;
        const profit = net;

        const todayKey = new Date().toDateString();
        const todayPL = trades
            .filter(t => new Date(t.entryDate).toDateString() === todayKey)
            .reduce((s, t) => s + (t.profitLoss || 0), 0);

        // high-water-mark drawdown
        const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
        let run = 0, peak = 0, dd = 0;
        sorted.forEach(t => { run += t.profitLoss || 0; peak = Math.max(peak, run); dd = Math.max(dd, peak - run); });

        const tradingDays = new Set(trades.map(t => String(t.entryDate).split('T')[0])).size;

        const dailyLimit = acc.max_daily_loss;
        const ddLimit = acc.max_overall_drawdown;
        const usedDaily = Math.max(0, -todayPL);
        const remDaily = dailyLimit ? dailyLimit - usedDaily : null;
        const remDD = ddLimit ? ddLimit - dd : null;

        // ---- warnings (only from user-configured rules) ----
        const warnings = [];
        if (dailyLimit) {
            if (remDaily <= 0) warnings.push({ type: 'danger', text: `🛑 Daily loss limit reached (${formatCurrency(usedDaily)} of ${formatCurrency(dailyLimit)} used). Consider stopping for today.` });
            else if (remDaily <= dailyLimit * 0.2) warnings.push({ type: 'warn', text: `⚠️ Daily Drawdown Warning — you are approaching your daily loss limit. ${formatCurrency(remDaily)} remaining.` });
        }
        if (ddLimit) {
            if (remDD <= 0) warnings.push({ type: 'danger', text: '🛑 Maximum overall drawdown reached — account rules breached.' });
            else if (remDD <= ddLimit * 0.25) warnings.push({ type: 'warn', text: `⚠️ Drawdown Warning — your account is approaching the configured maximum drawdown. ${formatCurrency(remDD)} remaining.` });
        }
        const targetHit = acc.profit_target && profit >= acc.profit_target;
        const pct = acc.profit_target ? Math.max(0, Math.min(100, (profit / acc.profit_target) * 100)) : 0;

        const valClass = (rem, limit, warnAt) =>
            rem === null ? '' : rem <= 0 ? 'text-danger' : (limit && rem <= limit * warnAt) ? 'text-warning' : 'text-success';

        panel.innerHTML = `
        <div class="funded-panel">
            <div class="funded-head">
                <div>
                    <span class="funded-firm">${acc.firm_name || 'Prop Firm'}</span>
                    <span class="funded-phase">${acc.phase || 'Funded'}</span>
                </div>
                <span class="funded-type">🟣 Funded Account</span>
            </div>
            <div class="funded-grid">
                <div class="funded-card">
                    <div class="f-label">Current Balance</div>
                    <div class="f-value">${formatCurrency(balance)}</div>
                    <div class="f-sub">Start: ${formatCurrency(acc.starting_balance || 0)}</div>
                </div>
                <div class="funded-card wide">
                    <div class="f-label">Profit Target</div>
                    <div class="f-value ${profit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(profit)} <span class="f-of">/ ${formatCurrency(acc.profit_target || 0)}</span></div>
                    <div class="f-bar"><div class="f-fill" style="width:${pct}%"></div></div>
                    <div class="f-sub">${formatPercentage(pct)} of target</div>
                </div>
                <div class="funded-card">
                    <div class="f-label">Daily Loss Left</div>
                    <div class="f-value ${valClass(remDaily, dailyLimit, 0.2)}">${remDaily === null ? '—' : formatCurrency(remDaily)}</div>
                    <div class="f-sub">Limit ${dailyLimit ? formatCurrency(dailyLimit) : '—'} · Today ${formatCurrency(todayPL)}</div>
                </div>
                <div class="funded-card">
                    <div class="f-label">Max DD Left</div>
                    <div class="f-value ${valClass(remDD, ddLimit, 0.25)}">${remDD === null ? '—' : formatCurrency(remDD)}</div>
                    <div class="f-sub">Current drawdown: ${formatCurrency(dd)}</div>
                </div>
                <div class="funded-card">
                    <div class="f-label">Trading Days</div>
                    <div class="f-value">${tradingDays}${acc.min_trading_days ? ' / ' + acc.min_trading_days : ''}</div>
                    <div class="f-sub">${acc.min_trading_days ? (tradingDays >= acc.min_trading_days ? 'Requirement met ✅' : (acc.min_trading_days - tradingDays) + ' days to go') : 'No minimum set'}</div>
                </div>
            </div>
            ${warnings.map(w => `<div class="funded-alert ${w.type}">${w.text}</div>`).join('')}
            ${targetHit ? `<div class="funded-alert success">🎉 Profit target reached — outstanding discipline!</div>` : ''}
        </div>`;
    }

    window.tvFundedRender = renderFunded;

    function hookDashboard() {
        if (window.dashboard && !dashboard.__fundedHooked) {
            dashboard.__fundedHooked = true;
            const orig = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await orig(); renderFunded(); return r; };
        }
    }

    function boot() {
        hookDashboard();
        renderFunded();
    }

    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot);
    window.addEventListener('tv-client-ready', () => setTimeout(boot, 600));
})();
