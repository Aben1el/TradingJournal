// ============ TradeVault Platform Pack ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .acc-sum { padding: .7rem .9rem; margin-bottom: .5rem; border-radius: 12px; background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.25); font-size: .72rem; color: var(--text-secondary); display: flex; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
        .acc-sum b { color: var(--text-primary); }
        .pf-btnrow { display: flex; gap: .5rem; flex-wrap: wrap; margin: .8rem 0; }
        .plan-view { margin-top: .6rem; padding: .7rem .9rem; border-radius: 12px; background: rgba(46,189,133,.07); border: 1px solid rgba(46,189,133,.3); font-size: .75rem; color: var(--text-secondary); white-space: pre-wrap; display: none; }
    `;
    document.head.appendChild(st);
    const wait = () => new Promise(r => { if (window.tvClient) return r(); window.addEventListener('tv-client-ready', () => r(), { once: true }); setTimeout(() => r(), 2500); });

        /* ---- All Accounts overview in switcher ---- */
    let accSumAdded = false;
    new MutationObserver(async () => {
        const menu = document.querySelector('.acc-menu');
        if (!menu || accSumAdded || !window.tvClient) return;
        accSumAdded = true;
        // Remove any duplicates first
        menu.querySelectorAll('.acc-sum').forEach(el => el.remove());
        const { data: accs } = await tvClient.from('trading_accounts').select('id,starting_balance');
        const { data: all } = await tvClient.from('trades').select('account_id,profit_loss');
        let bal = 0, pl = 0;
        (all || []).forEach(t => pl += t.profit_loss || 0);
        (accs || []).forEach(a => bal += parseFloat(a.starting_balance) || 0);
        const div = document.createElement('div');
        div.className = 'acc-sum';
        div.innerHTML = `<span>All accounts: <b>${(accs || []).length}</b> · <b>${(all || []).length}</b> trades</span><span>Combined: <b>${formatCurrency(bal + pl)}</b></span>`;
        menu.prepend(div);
    }).observe(document.body, { childList: true, subtree: true });

    /* ---- extra achievements (appended to existing grid) ---- */
    new MutationObserver(async () => {
        const grid = document.querySelector('.badge-grid');
        if (!grid || grid.dataset.pf || typeof db === 'undefined') return;
        grid.dataset.pf = '1';
        const trades = await db.getAllTrades();
        const wins = trades.filter(t => t.profitLoss > 0).length;
        const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
        let maxW = 0, c = 0; sorted.forEach(t => { c = t.profitLoss > 0 ? c + 1 : 0; maxW = Math.max(maxW, c); });
        const months = {}; trades.forEach(t => { const k = String(t.entryDate).slice(0, 7); months[k] = (months[k] || 0) + (t.profitLoss || 0); });
        const profMonth = Object.values(months).some(v => v > 0);
        const week = trades.filter(t => (new Date() - new Date(t.entryDate)) < 7 * 864e5);
        const cleanWeek = week.length > 0 && week.every(t => !t.ruleBroken);
        [['💯', '100 Trades', 'Record 100 trades', trades.length >= 100],
         ['🥇', '10 Wins', 'Book 10 winning trades', wins >= 10],
         ['🔥', '7 Streak', '7 winning trades in a row', maxW >= 7],
         ['', 'Green Month', 'Finish any month profitable', profMonth],
         ['🧼', 'Clean Week', '7 days trading, zero rule breaks', cleanWeek]
        ].forEach(([i, t, d, ok]) => grid.insertAdjacentHTML('beforeend', `<div class="ach ${ok ? 'unlocked' : ''}" title="${d}"><div class="ico">${i}</div><span>${t}</span></div>`));
    }).observe(document.body, { childList: true, subtree: true });

    /* ---- Trading Plan ---- */
    async function openPlan() {
        await wait();
        const { data: s } = await tvClient.auth.getSession(); if (!s.session) return;
        const { data: row } = await tvClient.from('trading_plans').select('*').eq('user_id', s.session.user.id).maybeSingle();
        const p = (row && row.plan) || {};
        const ov = document.createElement('div'); ov.className = 'acc-overlay';
        const f = (l, k, ph) => `<div class="form-group"><label>${l}</label><input class="form-control" id="pl_${k}" value="${p[k] || ''}" placeholder="${ph || ''}"></div>`;
        ov.innerHTML = `<div class="acc-modal"><h2>📋 My Trading Plan</h2><form id="plForm"><div class="acc-grid">
          ${f('Markets I trade', 'markets', 'XAUUSD, EURUSD…')}${f('Strategies', 'strategies', 'Breakout, Pullback…')}
          ${f('Entry rules', 'entryRules', 'Liquidity sweep + confirmation')}${f('Exit rules', 'exitRules', 'TP at structure, stop to BE')}
          ${f('Risk per trade %', 'riskPerTrade', '1%')}${f('Max daily loss %', 'maxDailyLoss', '3%')}
          ${f('Trading sessions', 'sessions', 'London only')}${f('Rules I never break', 'neverBreak', 'No trades after 2 losses')}
        </div><div class="acc-actions"><button type="button" class="btn btn-secondary" id="plCancel">Cancel</button><button class="btn btn-primary">Save Plan</button></div></form></div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        ov.querySelector('#plCancel').onclick = () => ov.remove();
        ov.querySelector('#plForm').onsubmit = async e => {
            e.preventDefault();
            const plan = {};
            ['markets', 'strategies', 'entryRules', 'exitRules', 'riskPerTrade', 'maxDailyLoss', 'sessions', 'neverBreak'].forEach(k => plan[k] = ov.querySelector('#pl_' + k).value.trim());
            const { error } = row
                ? await tvClient.from('trading_plans').update({ plan, updated_at: new Date().toISOString() }).eq('id', row.id)
                : await tvClient.from('trading_plans').insert({ user_id: s.session.user.id, plan });
            if (error) return showToast('Error: ' + error.message, 'error');
            window.__tvPlan = plan; ov.remove(); showToast('Trading plan saved 📋');
        };
        window.__tvPlan = p;
    }
    function planButton() {
        const hdr = document.querySelector('#journal .section-header');
        if (!hdr || document.getElementById('planBtn')) return;
        const b = document.createElement('button'); b.id = 'planBtn'; b.className = 'btn btn-secondary';
        b.textContent = '📋 Trading Plan'; b.onclick = openPlan; hdr.appendChild(b);
    }
    new MutationObserver(() => {
        const form = document.getElementById('tradeForm');
        if (!form || form.querySelector('#planPeek')) return;
        const wrap = document.createElement('div'); wrap.id = 'planPeek';
        wrap.innerHTML = `<button type="button" class="btn btn-text" id="planPeekBtn" style="min-height:auto;padding:.3rem .6rem;">📋 View my trading plan</button><div class="plan-view" id="planView"></div>`;
        form.prepend(wrap);
        wrap.querySelector('#planPeekBtn').onclick = async () => {
            const v = wrap.querySelector('#planView');
            if (v.style.display === 'block') { v.style.display = 'none'; return; }
            if (!window.__tvPlan) {
                await wait();
                const { data: s } = await tvClient.auth.getSession();
                const { data: r2 } = await tvClient.from('trading_plans').select('plan').eq('user_id', s.session.user.id).maybeSingle();
                window.__tvPlan = (r2 && r2.plan) || {};
            }
            const p = window.__tvPlan || {};
            v.textContent = Object.entries(p).filter(([, val]) => val).map(([k, val]) => `${k}: ${val}`).join('\n') || 'No plan yet — create one from the Journal page.';
            v.style.display = 'block';
        };
    }).observe(document.body, { childList: true, subtree: true });

    /* ---- Review quick filters ---- */
    function reviewFilters() {
        const sec = document.getElementById('reviews');
        if (!sec || document.getElementById('pfRevRow')) return;
        const row = document.createElement('div'); row.id = 'pfRevRow'; row.className = 'pf-btnrow';
        row.innerHTML = `<button class="btn btn-secondary" data-f="losers">My losers</button><button class="btn btn-secondary" data-f="rules">Rule breaks</button><button class="btn btn-secondary" data-f="fomo">FOMO trades</button><button class="btn btn-secondary" data-f="best">Best strategy</button><button class="btn btn-secondary" data-f="clear">Clear filter</button>`;
        sec.querySelector('.section-header').after(row);
        row.onclick = async e => {
            const b = e.target.closest('button'); if (!b) return;
            const f = b.dataset.f;
            if (f === 'clear') window.tvTradeFilterFn = null;
            else if (f === 'losers') window.tvTradeFilterFn = t => t.profitLoss < 0;
            else if (f === 'rules') window.tvTradeFilterFn = t => t.ruleBroken;
            else if (f === 'fomo') window.tvTradeFilterFn = t => ((t.mistakes || '') + (t.emotionBefore || '')).toLowerCase().includes('fomo');
            else if (f === 'best') {
                const all = await db.getAllTrades(); const by = {};
                all.forEach(t => { by[t.strategy || '—'] = (by[t.strategy || '—'] || 0) + (t.profitLoss || 0); });
                const top = Object.entries(by).sort((a, b2) => b2[1] - a[1])[0];
                window.tvTradeFilterFn = t => t.strategy === top[0];
                showToast('Filtering by ' + top[0]);
            }
            document.querySelector('.nav-item[data-section="trades"]').click();
            setTimeout(() => { if (typeof trades !== 'undefined') trades.loadTrades(); }, 80);
        };
    }

    /* ---- day-of-week analytics ---- */
    async function dowChart() {
        const grid = document.querySelector('.analytics-full-grid');
        if (!grid || document.getElementById('dowCard') || typeof Chart === 'undefined' || typeof db === 'undefined') return;
        const trades = await db.getAllTrades(); if (!trades.length) return;
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const agg = days.map(() => ({ n: 0, pl: 0 }));
        trades.forEach(t => { const d = new Date(t.entryDate).getDay(); agg[d].n++; agg[d].pl += t.profitLoss || 0; });
        grid.insertAdjacentHTML('beforeend', '<div class="chart-container" id="dowCard"><h3>Performance by Day of Week</h3><canvas id="dowCanvas"></canvas></div>');
        new Chart(document.getElementById('dowCanvas'), {
            type: 'bar',
            data: { labels: days, datasets: [{ data: agg.map(a => a.n ? +(a.pl / a.n).toFixed(2) : 0), backgroundColor: agg.map(a => (a.n && a.pl >= 0) ? 'rgba(46,189,133,.6)' : 'rgba(229,83,107,.6)'), borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#8a8a93' } }, y: { ticks: { color: '#8a8a93', callback: v => '$' + v } } } }
        });
    }

    /* ---- quiet once-daily notifications ---- */
    async function quietNotifs() {
        const key = 'tv_notif_' + new Date().toISOString().split('T')[0];
        if (localStorage.getItem(key) || typeof db === 'undefined') return;
        localStorage.setItem(key, '1');
        const trades = await db.getAllTrades();
        const today = new Date().toISOString().split('T')[0];
        const tPnl = trades.filter(t => String(t.entryDate).split('T')[0] === today).reduce((s, t) => s + (t.profitLoss || 0), 0);
        const accId = localStorage.getItem('tv_active_account_id');
        if (accId && window.tvClient) {
            const { data: a } = await tvClient.from('trading_accounts').select('max_daily_loss,type').eq('id', accId).single();
            if (a && a.type === 'funded' && a.max_daily_loss && tPnl <= -parseFloat(a.max_daily_loss)) return showToast('🛑 Daily loss limit reached — stop trading today.', 'error');
        }
        const goals = (typeof db.getAllGoals === 'function') ? await db.getAllGoals().catch(() => []) : [];
        const near = (goals || []).find(g => g.target && g.current >= g.target * 0.8 && g.current < g.target);
        if (near) return showToast(`🎯 Goal "${near.name || 'goal'}" is ${Math.round(near.current / near.target * 100)}% complete!`);
        if (new Date().getDay() === 5) {
            const reviews = (typeof db.getAllReviews === 'function') ? await db.getAllReviews().catch(() => []) : [];
            const wk = (reviews || []).filter(r => new Date(r.created_at || r.entryDate || 0) > new Date(Date.now() - 7 * 864e5));
            if (!wk.length) showToast('📝 Weekend: write your weekly review to lock in this week\'s lessons.');
        }
    }

    /* ---- delete my account ---- */
    function deleteAccountBtn() {
        const card = [...document.querySelectorAll('#settings .settings-card')].find(c => c.querySelector('h3') && c.querySelector('h3').textContent.includes('Data Management'));
        if (!card || document.getElementById('delAccBtn')) return;
        const b = document.createElement('button'); b.id = 'delAccBtn'; b.className = 'btn btn-danger';
        b.style.marginTop = '.6rem'; b.textContent = 'Delete My Account';
        card.appendChild(b);
        b.onclick = async () => {
            if (!confirm('Delete YOUR ENTIRE ACCOUNT and all data? This cannot be undone.')) return;
            const ok = prompt('Type DELETE to confirm');
            if (ok !== 'DELETE') return showToast('Cancelled');
            await wait();
            await tvClient.rpc('delete_own_account');
            localStorage.clear();
            location.href = 'index.html';
        };
    }

    function boot() {
        planButton(); reviewFilters(); deleteAccountBtn(); dowChart(); quietNotifs();
        if (typeof dashboard !== 'undefined' && !dashboard.__pfHooked) {
            dashboard.__pfHooked = true;
            const od = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await od(); quietNotifs(); return r; };
            if (dashboard.loadAnalytics) {
                const oa = dashboard.loadAnalytics.bind(dashboard);
                dashboard.loadAnalytics = async function () { const r = await oa(); dowChart(); return r; };
            }
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 400);
    else window.addEventListener('load', () => setTimeout(boot, 400));
    const mc = document.getElementById('mainContent');
    if (mc) new MutationObserver(() => { if (mc.style.display === 'block') { planButton(); reviewFilters(); deleteAccountBtn(); } }).observe(mc, { attributes: true, attributeFilter: ['style'] });
})();
