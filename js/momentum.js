// ============ TradeVault Momentum ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .badge-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: .8rem; }
        .ach { display: flex; flex-direction: column; align-items: center; gap: .45rem; padding: 1rem .5rem; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-glass); text-align: center; transition: all .25s ease; }
        .ach .ico { font-size: 1.5rem; filter: grayscale(1); opacity: .4; transition: all .3s ease; }
        .ach span { font-size: .65rem; color: var(--text-secondary); line-height: 1.3; }
        .ach.unlocked { border-color: rgba(245,158,11,.4); background: linear-gradient(160deg, rgba(245,158,11,.12), rgba(245,158,11,.04)); box-shadow: 0 6px 18px rgba(245,158,11,.12); }
        .ach.unlocked .ico { filter: none; opacity: 1; }
        .ach:hover { transform: translateY(-3px); }
        .week-card { margin: 0 0 1.5rem; padding: 1.2rem 1.5rem; border-radius: 14px; border: 1px solid rgba(46,189,133,.3); background: linear-gradient(90deg, rgba(46,189,133,.1), rgba(46,189,133,.03)); display: flex; gap: 2rem; flex-wrap: wrap; align-items: center; animation: cardIn .5s ease backwards; }
        .week-card h4 { font-size: .9rem; margin-right: auto; }
        .week-item { text-align: center; }
        .week-item b { display: block; font-size: 1.05rem; }
        .week-item small { color: var(--text-secondary); font-size: .68rem; text-transform: uppercase; letter-spacing: .05em; }
        :is(button, a, input, select, textarea):focus-visible { outline: 2px solid rgba(99,102,241,.7); outline-offset: 2px; border-radius: 8px; }
    `;
    document.head.appendChild(st);

    const wait = () => new Promise(r => {
        if (window.tvClient) return r();
        window.addEventListener('tv-client-ready', () => r(), { once: true });
        setTimeout(() => r(), 2500);
    });
    const sum = a => a.reduce((s, t) => s + (t.profitLoss || 0), 0);
    const wr = a => a.length ? Math.round(a.filter(t => t.profitLoss > 0).length / a.length * 100) : 0;

    // perf + a11y
    document.querySelectorAll('img').forEach(i => { if (!i.loading) i.loading = 'lazy'; });

    // ================= ACHIEVEMENTS =================
    function maxWinStreak(trades) {
        const s = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
        let m = 0, c = 0;
        s.forEach(t => { c = t.profitLoss > 0 ? c + 1 : 0; m = Math.max(m, c); });
        return m;
    }
    const ACH = [
        { id: 'first_trade', ico: '📈', t: 'First Trade', d: 'Record your first trade', c: x => x.trades.length >= 1 },
        { id: 'first_win', ico: '🏆', t: 'First Win', d: 'Book your first winning trade', c: x => x.trades.some(t => t.profitLoss > 0) },
        { id: 'ten', ico: '🔟', t: 'Double Digits', d: 'Record 10 trades', c: x => x.trades.length >= 10 },
        { id: 'fifty', ico: '📚', t: 'Half Century', d: 'Record 50 trades', c: x => x.trades.length >= 50 },
        { id: 'streak3', ico: '🔥', t: 'On Fire', d: '3 winning trades in a row', c: x => maxWinStreak(x.trades) >= 3 },
        { id: 'disc', ico: '🧘', t: 'Disciplined', d: 'Avg discipline ≥ 8 over 5+ trades', c: x => { const d = x.trades.filter(t => t.discipline); return d.length >= 5 && (d.reduce((s, t) => s + t.discipline, 0) / d.length) >= 8; } },
        { id: 'review', ico: '📝', t: 'Reflective', d: 'Write your first review', c: x => x.reviews.length >= 1 },
        { id: 'funded', ico: '🎯', t: 'Target Hit', d: 'Reach a funded profit target', c: x => x.fundedHit },
        { id: 'green_week', ico: '💚', t: 'Green Week', d: 'Finish a week in profit', c: x => x.greenWeek }
    ];

    async function achievements() {
        await wait();
        if (!window.tvClient || document.querySelector('.badge-grid')) return;
        const right = document.querySelector('.profile-right');
        if (!right) return;

        const trades = await db.getAllTrades();
        const reviews = await db.getAllReviews();
        const accs = window.tvAccountsList || [];
        const pl = sum(trades);
        const fundedHit = accs.some(a => a.type === 'funded' && a.profit_target && pl >= a.profit_target);
        const weeks = {};
        trades.forEach(t => {
            const d = new Date(t.entryDate); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
            const k = mon.toDateString(); weeks[k] = (weeks[k] || 0) + (t.profitLoss || 0);
        });
        const ctx = { trades, reviews, fundedHit, greenWeek: Object.values(weeks).some(v => v > 0) };

        const seen = JSON.parse(localStorage.getItem('tv_ach') || '[]');
        const unlocked = ACH.filter(a => a.c(ctx));
        const fresh = unlocked.filter(a => !seen.includes(a.id));
        if (fresh.length) {
            localStorage.setItem('tv_ach', JSON.stringify(unlocked.map(a => a.id)));
            fresh.forEach(a => showToast(`🏆 Achievement unlocked: ${a.t}!`));
        }

        const wrap = document.createElement('div');
        wrap.innerHTML = `<h3 style="margin:0 0 1rem;font-size:1.05rem;">Achievements</h3>
            <div class="badge-grid">` + ACH.map(a => `
                <div class="ach ${unlocked.includes(a) ? 'unlocked' : ''}" title="${a.d}">
                    <div class="ico">${a.ico}</div><span>${a.t}</span>
                </div>`).join('') + `</div>`;
        right.querySelector('.edit-card').before(wrap);
    }

    // ================= WEEK IN REVIEW =================
    async function weekReview() {
        await wait();
        const dash = document.getElementById('dashboard');
        const main = document.getElementById('mainContent');
        if (!dash || document.getElementById('weekCard') || typeof db === 'undefined') return;
        if (!(main && main.style.display === 'block')) return;
        const trades = await db.getAllTrades();
        if (!trades.length) return;

        const sow = new Date(); sow.setDate(sow.getDate() - ((sow.getDay() + 6) % 7)); sow.setHours(0, 0, 0, 0);
        const eow = new Date(sow); eow.setDate(eow.getDate() + 7);
        const prev = new Date(sow); prev.setDate(prev.getDate() - 7);
        const inR = (t, a, b) => { const d = new Date(t.entryDate); return d >= a && d < b; };
        const tw = trades.filter(t => inR(t, sow, eow));
        const lw = trades.filter(t => inR(t, prev, sow));

        const card = document.createElement('div');
        card.id = 'weekCard'; card.className = 'week-card';
        card.innerHTML = `<h4>📅 Your Week in Review</h4>
            <div class="week-item"><b class="${sum(tw) >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(sum(tw))}</b><small>P&L this week</small></div>
            <div class="week-item"><b>${tw.length}</b><small>Trades</small></div>
            <div class="week-item"><b>${wr(tw)}%</b><small>Win rate</small></div>
            <div class="week-item"><b class="${sum(tw) >= sum(lw) ? 'text-success' : 'text-danger'}">${lw.length === 0 ? '—' : (sum(tw) >= sum(lw) ? '▲ better' : '▼ worse')}</b><small>vs last week</small></div>`;
        const onb = document.getElementById('onbCard');
        if (onb) onb.after(card); else dash.querySelector('.dash-header').after(card);
    }

    // ================= STRATEGY DEEP-DIVE =================
    document.addEventListener('click', async (e) => {
        const card = e.target.closest('.strategy-card');
        if (!card || e.target.closest('button')) return;
        const name = (card.querySelector('.strategy-name') || {}).textContent;
        if (!name || name === 'N/A') return;
        const ov = document.getElementById('modalOverlay');
        if (!ov || ov.classList.contains('active')) return;

        const trades = (await db.getAllTrades()).filter(t => t.strategy === name);
        if (!trades.length) return showToast('No trades for this strategy yet');

        const best = Math.max(...trades.map(t => t.profitLoss));
        const worst = Math.min(...trades.map(t => t.profitLoss));
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header"><h2>⭐ ${name}</h2><button class="modal-close" onclick="app.closeModal()">✕</button></div>
            <div class="modal-body">
                <div class="trade-detail">
                    <div class="trade-detail-section">
                        <h4>Performance</h4>
                        <div class="trade-detail-grid">
                            <div><strong>Trades:</strong> ${trades.length}</div>
                            <div><strong>Win rate:</strong> ${wr(trades)}%</div>
                            <div><strong>Total P/L:</strong> <span class="${sum(trades) >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(sum(trades))}</span></div>
                            <div><strong>Best:</strong> <span class="text-success">${formatCurrency(best)}</span></div>
                            <div><strong>Worst:</strong> <span class="text-danger">${formatCurrency(worst)}</span></div>
                        </div>
                    </div>
                    <div class="trade-detail-section">
                        <h4>Trade History</h4>
                        ${trades.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate)).slice(0, 10).map(t => `
                            <div class="trade-detail-grid" style="margin-bottom:.5rem;">
                                <div><strong>${formatDate(t.entryDate)}</strong> ${t.symbol}</div>
                                <div class="${t.profitLoss >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(t.profitLoss)}</div>
                            </div>`).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer"><button class="btn btn-secondary" onclick="app.closeModal()">Close</button></div>`;
        ov.innerHTML = '';
        ov.appendChild(modal);
        ov.classList.add('active');
    });

    // ================= BOOT =================
    function boot() {
        achievements();
        weekReview();
        if (typeof dashboard !== 'undefined' && !dashboard.__momHooked) {
            dashboard.__momHooked = true;
            const orig = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await orig(); weekReview(); return r; };
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));

    const mc = document.getElementById('mainContent');
    if (mc) {
        new MutationObserver(() => { if (mc.style.display === 'block') weekReview(); }).observe(mc, { attributes: true, attributeFilter: ['style'] });
    }
})();
