// ============ TradeVault Useful Pack v3 ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        body.sb-collapsed .sync-pill { font-size: 0; justify-content: center; align-items: center; width: 26px; height: 26px; border-radius: 50%; margin: .6rem auto 0; padding: 0; }
        body.sb-collapsed .sync-pill .dot { margin: 0; }
        .stat-card[title], .today-card[title] { cursor: help; }
        .tv-fab { position: fixed; bottom: 5rem; right: 1.25rem; z-index: 96; width: 54px; height: 54px; border-radius: 50%; background: var(--accent-gradient); color: #fff; border: none; font-size: 1.6rem; font-weight: 700; display: none; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(99,102,241,.45); transition: transform .2s ease; }
        .tv-fab:active { transform: scale(.92); }
        @media (max-width: 768px) { .tv-fab { display: flex; } }
        .plan-card { margin: 0 0 1.5rem; padding: 1.2rem 1.5rem; border-radius: 14px; border: 1px solid rgba(46,189,133,.3); background: linear-gradient(90deg, rgba(46,189,133,.08), rgba(46,189,133,.02)); animation: cardIn .5s ease backwards; }
        .plan-card h4 { font-size: .9rem; margin-bottom: .5rem; }
        .plan-card textarea { width: 100%; min-height: 74px; resize: vertical; background: rgba(0,0,0,.25); border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-primary); padding: .7rem .9rem; font-family: inherit; font-size: .85rem; outline: none; }
        html[data-theme="light"] .plan-card textarea { background: rgba(20,22,40,.04); }
        .plan-card .row { display: flex; justify-content: space-between; align-items: center; margin-top: .6rem; gap: .8rem; flex-wrap: wrap; }
        .plan-card small { color: var(--text-tertiary); font-size: .68rem; }
        #tvTagBar { display: flex; gap: .4rem; flex-wrap: wrap; margin-bottom: .8rem; }
        .tv-tag-chip { min-height: 32px !important; padding: .2rem .8rem !important; border-radius: 100px !important; font-size: .7rem !important; }
    `;
    document.head.appendChild(st);

    /* ================= TAG FILTER ENGINE ================= */
    window.tvTagFilter = null;
    if (typeof db !== 'undefined' && !db.__tagWrap) {
        db.__tagWrap = true;
        const og = db.getAllTrades.bind(db);
        window.__tvAllTrades = og;
        db.getAllTrades = async function (...a) {
            const all = await og(...a);
            if (!window.tvTagFilter) return all;
            return all.filter(t => (t.tags || '').split(',').map(s => s.trim()).includes(window.tvTagFilter));
        };
    }
    const allTrades = () => (window.__tvAllTrades ? window.__tvAllTrades() : db.getAllTrades());

    async function tagBar() {
        const host = document.querySelector('#trades .filters-bar');
        if (!host || typeof db === 'undefined') return;
        const all = await allTrades();
        const tags = {};
        all.forEach(t => (t.tags || '').split(',').map(s => s.trim()).filter(Boolean).forEach(k => tags[k] = (tags[k] || 0) + 1));
        const keys = Object.keys(tags);
        let bar = document.getElementById('tvTagBar');
        if (!keys.length) { if (bar) bar.remove(); return; }
        if (!bar) {
            bar = document.createElement('div'); bar.id = 'tvTagBar';
            host.prepend(bar);
            bar.onclick = (e) => {
                const b = e.target.closest('.tv-tag-chip'); if (!b) return;
                const tag = b.dataset.tag;
                window.tvTagFilter = (window.tvTagFilter === tag) ? null : tag;
                refreshAll();
            };
        }
        bar.innerHTML = keys.map(k => `<button class="btn btn-secondary tv-tag-chip" data-tag="${k}">#${k} (${tags[k]})</button>`).join('');
        paintTagState();
    }

    function paintTagState() {
        document.querySelectorAll('.tv-tag-chip').forEach(b => {
            const on = b.dataset.tag === window.tvTagFilter;
            b.style.background = on ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '';
            b.style.color = on ? '#fff' : '';
            b.style.borderColor = on ? 'transparent' : '';
        });
        let ban = document.getElementById('tvTagBanner');
        if (window.tvTagFilter) {
            if (!ban) {
                ban = document.createElement('div'); ban.id = 'tvTagBanner';
                ban.style.cssText = 'margin:0 0 1rem;padding:.6rem 1rem;border-radius:12px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.4);font-size:.8rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;';
                document.querySelector('#trades .table-container');
                const tc = document.querySelector('#trades .table-container');
                if (tc) tc.before(ban);
            }
            ban.innerHTML = `<span>🏷️ Showing only <strong>#${window.tvTagFilter}</strong> — journal, charts & calendar filtered</span><button class="btn btn-text" id="tvTagClear" style="min-height:auto;padding:.2rem .6rem;">Clear ✕</button>`;
            const c = ban.querySelector('#tvTagClear');
            if (c) c.onclick = () => { window.tvTagFilter = null; refreshAll(); };
        } else if (ban) ban.remove();
    }

    function refreshAll() {
        paintTagState();
        if (typeof app !== 'undefined' && app.init) app.init();
        else {
            if (typeof trades !== 'undefined') trades.loadTrades();
            if (typeof dashboard !== 'undefined') dashboard.loadDashboard();
        }
    }

    /* ================= STRATEGY EQUITY IN DEEP-DIVE ================= */
    function strategyEquity() {
        const ov = document.getElementById('modalOverlay');
        if (!ov || typeof Chart === 'undefined') return;
        new MutationObserver(() => {
            const modal = ov.querySelector('.modal');
            if (!modal || modal.querySelector('#stratEqCanvas')) return;
            const h2 = modal.querySelector('.modal-header h2');
            if (!h2 || !h2.textContent.includes('⭐')) return;
            const name = h2.textContent.replace('⭐', '').trim();
            const section = modal.querySelector('.trade-detail-section');
            if (!section) return;
            const wrap = document.createElement('div');
            wrap.style.marginTop = '1rem';
            wrap.innerHTML = `<h4>Equity Curve — ${name}</h4><div style="height:220px;"><canvas id="stratEqCanvas"></canvas></div>`;
            section.after(wrap);
            (async () => {
                const all = await allTrades();
                const st = all.filter(t => t.strategy === name).sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
                if (!st.length) return;
                let run = 0;
                const data = st.map(t => run += t.profitLoss || 0);
                new Chart(document.getElementById('stratEqCanvas'), {
                    type: 'line',
                    data: { labels: st.map(t => formatDate(t.entryDate)), datasets: [{ data, borderColor: '#7c7ff2', backgroundColor: 'rgba(124,127,242,.15)', fill: true, tension: .3, pointRadius: 2, borderWidth: 2 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8a8a93', maxTicksLimit: 5, font: { size: 9 } } }, y: { ticks: { color: '#8a8a93', callback: v => '$' + v, font: { size: 9 } } } } }
                });
            })();
        }).observe(ov, { childList: true, subtree: true });
    }

    /* ================= CALENDAR HOVER DETAILS ================= */
    function calendarHover() {
        document.addEventListener('mouseover', async (e) => {
            const cell = e.target.closest('[data-date]');
            if (!cell || cell.__pop) return;
            const date = cell.dataset.date;
            const all = await allTrades();
            const day = all.filter(t => String(t.entryDate).split('T')[0] === date);
            if (!day.length) return;
            const pop = document.createElement('div');
            pop.style.cssText = 'position:fixed;z-index:800;max-width:240px;background:rgba(20,22,30,.97);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:.7rem .9rem;font-size:.72rem;color:#c9c9d2;box-shadow:0 20px 60px rgba(0,0,0,.5);pointer-events:none;';
            const r = cell.getBoundingClientRect();
            pop.style.left = Math.min(window.innerWidth - 250, r.left) + 'px';
            pop.style.top = (r.bottom + 8) + 'px';
            pop.innerHTML = `<strong style="color:#fff;">${formatDate(date)}</strong>` + day.map(t => `<div style="display:flex;justify-content:space-between;gap:.6rem;margin-top:.25rem;"><span>${t.symbol} · ${t.direction}</span><span style="color:${t.profitLoss >= 0 ? '#2ebd85' : '#e5536b'}">${formatCurrency(t.profitLoss)}</span></div>`).join('');
            document.body.appendChild(pop);
            cell.__pop = pop;
        });
        document.addEventListener('mouseout', (e) => {
            const cell = e.target.closest('[data-date]');
            if (cell && cell.__pop) { cell.__pop.remove(); cell.__pop = null; }
        });
    }

    /* ================= v2 FEATURES ================= */
    const HINTS = [
        ['PROFIT FACTOR', 'Gross wins ÷ gross losses. Above 1.5 = healthy edge. Below 1 = losing system → trade smaller and fix it.'],
        ['EXPECTANCY', 'Average $ you earn per trade. Positive = you have an edge.'],
        ['WIN RATE', 'How often you are right. Judge it together with Average R — 40% wins with big R is profitable.'],
        ['LOSS RATE', 'Flip side of win rate. Loss streaks inside this % are normal — trust the sample.'],
        ['AVERAGE R', 'Average reward per trade in R units. Bigger than your average loss R = edge.'],
        ['MAX DRAWDOWN', 'Worst peak-to-valley drop in $. If it makes you nervous, cut risk per trade in half.'],
        ['BEST TRADE', 'Biggest winner. Check it was ON plan — luck is not a strategy.'],
        ['WORST TRADE', 'Biggest loser. Check if it was OFF plan — that is usually the real lesson.'],
        ['AVERAGE WIN', 'What a typical winner pays you.'],
        ['AVERAGE LOSS', 'What a typical loser costs you. Keep it smaller than your average win.'],
        ['TOTAL TRADES', 'Your sample size. Bigger = every other number becomes more trustworthy.'],
        ['NET P/L', 'Net result of all recorded trades.'],
        ['TOTAL P&L', 'Net result of all recorded trades.'],
        ["TODAY'S P&L", 'Profit/loss closed today. Green day = the plan worked today.'],
        ['CURRENT BALANCE', 'Starting balance plus all P/L.'],
        ['TRADING STREAK', 'Consecutive wins. Ride streaks — but never force a trade to protect one.']
    ];
    function applyHints() {
        document.querySelectorAll('.stat-card, .today-card').forEach(card => {
            if (card.dataset.hinted) return;
            const label = (card.querySelector('.stat-label, .today-label') || {}).textContent || '';
            const up = label.toUpperCase();
            const hit = HINTS.find(h => up.includes(h[0]));
            if (hit) { card.title = hit[1]; card.dataset.hinted = '1'; }
        });
    }
    function fab() {
        const main = document.getElementById('mainContent');
        if (!(main && main.style.display === 'block')) return;
        if (document.getElementById('tvFab')) return;
        const b = document.createElement('button');
        b.id = 'tvFab'; b.className = 'tv-fab'; b.textContent = '+'; b.title = 'Add trade';
        b.onclick = () => { if (typeof trades !== 'undefined') trades.showTradeModal(); };
        document.body.appendChild(b);
    }
    function battlePlan() {
        const dash = document.getElementById('dashboard');
        const main = document.getElementById('mainContent');
        if (!dash || document.getElementById('planCard') || typeof db === 'undefined') return;
        if (!(main && main.style.display === 'block')) return;
        const key = 'tv_plan_' + new Date().toISOString().split('T')[0];
        const saved = localStorage.getItem(key) || '';
        const card = document.createElement('div');
        card.id = 'planCard'; card.className = 'plan-card';
        card.innerHTML = `
            <h4>🎯 Today's Battle Plan</h4>
            <textarea id="planText" placeholder="Write your rules BEFORE you trade: max 2 trades, London only, no revenge after a loss…">${saved}</textarea>
            <div class="row">
                <small>${saved ? '✅ Plan written — trade only what\'s on this list.' : 'No plan yet today. Traders with written plans skip 60% of bad trades.'}</small>
                <button class="btn btn-primary" id="planSave" style="min-height:38px;">Save Plan</button>
            </div>`;
        const coach = document.getElementById('coachCard');
        const score = document.getElementById('scoreCard');
        if (coach) coach.after(card); else if (score) score.after(card); else dash.querySelector('.dash-header').after(card);
        card.querySelector('#planSave').onclick = () => {
            localStorage.setItem(key, card.querySelector('#planText').value.trim());
            showToast('Battle plan locked in 🎯');
            card.querySelector('.row small').textContent = '✅ Plan written — trade only what\'s on this list.';
        };
    }
    async function newHigh() {
        if (typeof db === 'undefined') return;
        const trades = await allTrades();
        if (!trades.length) return;
        const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
        let run = 0, peak = 0;
        sorted.forEach(t => { run += t.profitLoss || 0; peak = Math.max(peak, run); });
        const seen = parseFloat(localStorage.getItem('tv_eq_high') || '0');
        if (peak > seen && peak > 0) {
            localStorage.setItem('tv_eq_high', String(peak));
            if (seen > 0) showToast(`🚀 NEW EQUITY HIGH: ${formatCurrency(peak)}!`);
        }
    }

    /* ================= BOOT ================= */
    function boot() {
        applyHints(); fab(); battlePlan(); newHigh(); tagBar(); strategyEquity(); calendarHover();
        if (typeof trades !== 'undefined' && !trades.__uv3) {
            trades.__uv3 = true;
            const ol = trades.loadTrades.bind(trades);
            trades.loadTrades = async function () { const r = await ol(); tagBar(); paintTagState(); return r; };
        }
        if (typeof dashboard !== 'undefined' && !dashboard.__usefulHooked) {
            dashboard.__usefulHooked = true;
            const od = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await od(); applyHints(); fab(); battlePlan(); newHigh(); return r; };
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
    const mc = document.getElementById('mainContent');
    if (mc) new MutationObserver(() => { if (mc.style.display === 'block') { applyHints(); fab(); battlePlan(); tagBar(); } }).observe(mc, { attributes: true, attributeFilter: ['style'] });
})();
