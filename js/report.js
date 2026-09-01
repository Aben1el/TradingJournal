// ============ TradeVault: Auto Theme + Monthly PDF Report ============
(function () {
    const SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    const MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    const AUTO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';

    const st = document.createElement('style');
    st.textContent = `
        #tvReport { position: fixed; inset: 0; z-index: 800; overflow-y: auto; background: rgba(5,5,8,.8); backdrop-filter: blur(6px); padding: 2rem 1rem; }
        .tv-paper { max-width: 760px; margin: 0 auto; background: #fdfdfc; color: #17181c; border-radius: 14px; padding: 2.5rem; box-shadow: 0 40px 120px rgba(0,0,0,.6); font-family: Inter, Arial, sans-serif; }
        .tv-paper h1 { font-size: 1.6rem; margin: 0; }
        .tv-paper .sub { color: #7a7c85; font-size: .85rem; margin: .3rem 0 1.6rem; }
        .tv-paper .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .8rem; margin-bottom: 1.6rem; }
        .tv-paper .cell { border: 1px solid #e6e6e2; border-radius: 10px; padding: .8rem; }
        .tv-paper .cell b { display: block; font-size: 1.05rem; }
        .tv-paper .cell small { color: #7a7c85; font-size: .65rem; text-transform: uppercase; letter-spacing: .05em; }
        .tv-paper h2 { font-size: .95rem; margin: 1.4rem 0 .6rem; }
        .tv-paper table { width: 100%; border-collapse: collapse; font-size: .8rem; }
        .tv-paper td, .tv-paper th { padding: .45rem .5rem; border-bottom: 1px solid #ecece8; text-align: left; }
        .tv-paper .pos { color: #0a9970; font-weight: 700; } .tv-paper .neg { color: #d64550; font-weight: 700; }
        .tv-paper .actions { margin-top: 1.8rem; display: flex; gap: .7rem; }
        .tv-paper .actions button { padding: .7rem 1.4rem; border-radius: 100px; border: none; cursor: pointer; font-weight: 600; font-family: inherit; }
        .tv-print { background: #17181c; color: #fff; } .tv-close { background: #ecece8; color: #17181c; }
        @media print {
            body * { visibility: hidden; }
            #tvReport, #tvReport * { visibility: visible; }
            #tvReport { position: absolute; inset: 0; background: #fff; padding: 0; }
            .tv-paper { box-shadow: none; border-radius: 0; max-width: 100%; }
            .tv-paper .actions { display: none !important; }
        }
        @media (max-width: 640px) { .tv-paper .grid { grid-template-columns: repeat(2, 1fr); } .tv-paper { padding: 1.5rem; } }
    `;
    document.head.appendChild(st);

    // ================= AUTO THEME =================
    const sysLight = () => matchMedia('(prefers-color-scheme: light)').matches;
    function applyResolved() {
        const t = localStorage.getItem('tv_theme') || 'dark';
        const resolved = t === 'auto' ? (sysLight() ? 'light' : 'dark') : t;
        document.documentElement.dataset.theme = resolved;
        if (typeof Chart !== 'undefined') Chart.defaults.color = resolved === 'light' ? '#5b6070' : '#8a8a93';
        return resolved;
    }
    function refreshCharts() {
        if (typeof dashboard === 'undefined') return;
        const active = document.querySelector('.section.active');
        if (active && active.id === 'dashboard') dashboard.loadDashboard();
        if (active && active.id === 'analytics') dashboard.loadAnalytics();
    }
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
        if ((localStorage.getItem('tv_theme') || 'dark') === 'auto') { applyResolved(); refreshCharts(); }
    });

    function upgradeToggles() {
        document.querySelectorAll('.tv-theme-btn').forEach(b => {
            if (b.__tv3) return;
            b.__tv3 = true;
            const setIcon = () => {
                const t = localStorage.getItem('tv_theme') || 'dark';
                b.innerHTML = t === 'dark' ? SUN : t === 'light' ? MOON : AUTO;
                b.title = 'Theme: ' + t;
            };
            setIcon();
            b.onclick = (e) => {
                e.stopPropagation();
                const cur = localStorage.getItem('tv_theme') || 'dark';
                const next = cur === 'dark' ? 'light' : cur === 'light' ? 'auto' : 'dark';
                localStorage.setItem('tv_theme', next);
                applyResolved();
                setIcon();
                refreshCharts();
                if (typeof showToast !== 'undefined') showToast('Theme: ' + next + (next === 'auto' ? ' (follows device)' : ''));
            };
        });
    }
    new MutationObserver(upgradeToggles).observe(document.body, { childList: true, subtree: true });
    if ((localStorage.getItem('tv_theme') || 'dark') === 'auto') applyResolved();

    // ================= MONTHLY REPORT =================
    function buildReportBtn() {
        const header = document.querySelector('#dashboard .dash-header');
        if (!header || document.getElementById('reportBtn') || typeof db === 'undefined') return;
        const b = document.createElement('button');
        b.id = 'reportBtn';
        b.className = 'btn btn-secondary';
        b.textContent = '📄 Monthly Report';
        b.onclick = openReport;
        header.appendChild(b);
    }

    async function openReport() {
        const trades = await db.getAllTrades();
        const mk = new Date().toISOString().slice(0, 7);
        const mt = trades.filter(t => String(t.entryDate).slice(0, 7) === mk);
        const sum = a => a.reduce((s, t) => s + (t.profitLoss || 0), 0);
        const wins = mt.filter(t => t.profitLoss > 0);
        const losses = mt.filter(t => t.profitLoss < 0);
        const wr = mt.length ? Math.round((wins.length / mt.length) * 100) : 0;
        const best = mt.length ? Math.max(...mt.map(t => t.profitLoss)) : 0;
        const worst = mt.length ? Math.min(...mt.map(t => t.profitLoss)) : 0;
        const strat = {};
        mt.forEach(t => { const k = t.strategy || 'No strategy'; strat[k] = (strat[k] || 0) + (t.profitLoss || 0); });
        const topStrat = Object.entries(strat).sort((a, b) => b[1] - a[1])[0];
        const user = (window.tvProfile && window.tvProfile.username) || (document.getElementById('sidebarUserName') || {}).textContent || 'Trader';
        const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const ov = document.createElement('div');
        ov.id = 'tvReport';
        ov.innerHTML = `
        <div class="tv-paper">
            <h1>TradeVault — Monthly Report</h1>
            <div class="sub">${monthName} · @${user} · generated ${new Date().toLocaleDateString()}</div>
            <div class="grid">
                <div class="cell"><b>${mt.length}</b><small>Trades</small></div>
                <div class="cell"><b class="${sum(mt) >= 0 ? 'pos' : 'neg'}">${formatCurrency(sum(mt))}</b><small>Net P&L</small></div>
                <div class="cell"><b>${wr}%</b><small>Win rate</small></div>
                <div class="cell"><b>${wins.length}W / ${losses.length}L</b><small>Record</small></div>
                <div class="cell"><b class="pos">${formatCurrency(best)}</b><small>Best trade</small></div>
                <div class="cell"><b class="neg">${formatCurrency(worst)}</b><small>Worst trade</small></div>
                <div class="cell"><b>${topStrat ? topStrat[0] : '—'}</b><small>Top strategy</small></div>
                <div class="cell"><b>${formatCurrency(topStrat ? topStrat[1] : 0)}</b><small>Its P&L</small></div>
            </div>
            <h2>All trades this month</h2>
            <table>
                <tr><th>Date</th><th>Symbol</th><th>Direction</th><th>Strategy</th><th>P/L</th></tr>
                ${mt.length ? mt.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate)).map(t => `
                    <tr>
                        <td>${formatDate(t.entryDate)}</td>
                        <td>${t.symbol}</td>
                        <td>${t.direction || '—'}</td>
                        <td>${t.strategy || '—'}</td>
                        <td class="${t.profitLoss >= 0 ? 'pos' : 'neg'}">${formatCurrency(t.profitLoss)}</td>
                    </tr>`).join('') : '<tr><td colspan="5">No trades recorded this month.</td></tr>'}
            </table>
            <div class="actions">
                <button class="tv-print" onclick="window.print()"> Download PDF</button>
                <button class="tv-close" onclick="document.getElementById('tvReport').remove()">Close</button>
            </div>
        </div>`;
        ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
        document.body.appendChild(ov);
    }

    function boot() { buildReportBtn(); upgradeToggles(); }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
    const mc = document.getElementById('mainContent');
    if (mc) new MutationObserver(() => { if (mc.style.display === 'block') buildReportBtn(); }).observe(mc, { attributes: true, attributeFilter: ['style'] });
})();
