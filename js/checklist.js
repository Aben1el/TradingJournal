// ============ TradeVault Pre-Trade Checklist ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .tv-check { margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem; }
        .tv-check h5 { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-secondary); margin-bottom: .6rem; }
        .tv-check label { display: flex; align-items: center; gap: .6rem; padding: .35rem 0; font-size: .82rem; color: var(--text-secondary); cursor: pointer; }
        .tv-check input { accent-color: #6366f1; width: 16px; height: 16px; }
        .tv-check input:checked + span { color: var(--text-primary); }
        .plan-badge { display: inline-block; margin-left: .4rem; padding: .05rem .55rem; border-radius: 100px; font-size: .6rem; font-weight: 700; letter-spacing: .03em; }
        .plan-badge.yes { background: rgba(46,189,133,.12); color: #2ebd85; border: 1px solid rgba(46,189,133,.35); }
        .plan-badge.no { background: rgba(229,83,107,.12); color: #e5536b; border: 1px solid rgba(229,83,107,.35); }
    `;
    document.head.appendChild(st);

    const ITEMS = ['Trend / bias confirmed', 'Key level identified', 'Risk ≤ my limit', 'Not revenge / FOMO', 'Entry + stop + target planned'];

    function injectChecklist() {
        const form = document.getElementById('tradeForm');
        if (!form || form.querySelector('.tv-check')) return;
        const box = document.createElement('div');
        box.className = 'tv-check';
        box.innerHTML = `<h5>✅ Pre-Trade Checklist (A+ setup?)</h5>` + ITEMS.map((t, i) => `
            <label><input type="checkbox" name="chk${i}"><span>${t}</span></label>`).join('');
        form.appendChild(box);
    }
    new MutationObserver(injectChecklist).observe(document.body, { childList: true, subtree: true });

    function countChecks() {
        const form = document.getElementById('tradeForm');
        if (!form || !form.querySelector('.tv-check')) return null;
        let n = 0;
        for (let i = 0; i < ITEMS.length; i++) {
            const c = form.querySelector('[name="chk' + i + '"]');
            if (c && c.checked) n++;
        }
        return n;
    }
    if (typeof db !== 'undefined' && !db.__chkFix) {
        db.__chkFix = true;
        const oa = db.addTrade.bind(db);
        db.addTrade = function (d) { const n = countChecks(); if (n !== null) d.checklist = n; return oa(d); };
        const ou = db.updateTrade.bind(db);
        db.updateTrade = function (d) { const n = countChecks(); if (n !== null) d.checklist = n; return ou(d); };
    }

    async function planBadges() {
        if (typeof db === 'undefined') return;
        const trades = await db.getAllTrades();
        const byId = {};
        trades.forEach(t => byId[String(t.id)] = t.checklist);
        document.querySelectorAll('.trade-card').forEach(card => {
            const m = (card.getAttribute('onclick') || '').match(/showTradeDetail\((\d+)\)/);
            if (!m || card.querySelector('.plan-badge')) return;
            const c = byId[m[1]];
            if (c === undefined || c === null) return;
            const head = card.querySelector('.trade-card-header');
            if (head) head.insertAdjacentHTML('beforeend', c >= 4 ? '<span class="plan-badge yes">FOLLOWED PLAN</span>' : '<span class="plan-badge no">OFF PLAN</span>');
        });
    }

    async function planAnalytics() {
        const grid = document.querySelector('.analytics-full-grid');
        if (!grid || document.getElementById('planCard') || typeof db === 'undefined') return;
        const trades = await db.getAllTrades();
        const withChk = trades.filter(t => t.checklist !== undefined && t.checklist !== null);
        if (withChk.length < 2) return;
        const on = withChk.filter(t => t.checklist >= 4);
        const off = withChk.filter(t => t.checklist < 4);
        const sum = a => a.reduce((s, t) => s + (t.profitLoss || 0), 0);
        const wr = a => a.length ? Math.round(a.filter(t => t.profitLoss > 0).length / a.length * 100) : 0;
        grid.insertAdjacentHTML('beforeend', `
            <div class="chart-container" id="planCard">
                <h3>Discipline Pays: Followed Plan vs Off Plan</h3>
                <div class="smart-insight ${sum(on) >= 0 ? 'success' : 'danger'}" style="margin-bottom:.6rem;">
                    <div class="insight-text"><strong>✅ Followed plan (${on.length}):</strong> ${wr(on)}% win · ${formatCurrency(sum(on))}</div>
                </div>
                <div class="smart-insight ${sum(off) >= 0 ? 'success' : 'danger'}">
                    <div class="insight-text"><strong>⚠️ Off plan (${off.length}):</strong> ${wr(off)}% win · ${formatCurrency(sum(off))}</div>
                </div>
            </div>`);
    }

    function hook() {
        if (typeof trades !== 'undefined' && !trades.__chkHooked) {
            trades.__chkHooked = true;
            const ol = trades.loadTrades.bind(trades);
            trades.loadTrades = async function () { const r = await ol(); planBadges(); return r; };
        }
        if (typeof dashboard !== 'undefined' && !dashboard.__chkHooked2 && dashboard.loadAnalytics) {
            dashboard.__chkHooked2 = true;
            const oa = dashboard.loadAnalytics.bind(dashboard);
            dashboard.loadAnalytics = async function () { const r = await oa(); planAnalytics(); return r; };
        }
    }
    function boot() { hook(); planBadges(); planAnalytics(); }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
})();
