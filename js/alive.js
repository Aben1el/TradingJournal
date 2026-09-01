// ============ TradeVault Data Alive ============
(function () {
    const SYM = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: '₣', AUD: 'A$', CAD: 'C$' };

    // ---------- 1. account currency everywhere ----------
    function curSymbol() {
        try {
            const id = localStorage.getItem('tv_active_account_id');
            const acc = (window.tvAccountsList || []).find(a => String(a.id) === String(id));
            return SYM[(acc && acc.currency) || 'USD'] || '$';
        } catch (e) { return '$'; }
    }
    if (typeof formatCurrency === 'function' && !window.__curWrapped) {
        window.__curWrapped = true;
        const orig = formatCurrency;
        formatCurrency = function (v, d) {
            const out = orig(v, d);
            const sym = curSymbol();
            return sym === '$' ? out : out.replace(/\$/g, sym);
        };
    }

    // ---------- 2. tag chips on journal cards ----------
    async function tagChips() {
        if (typeof db === 'undefined') return;
        const trades = await db.getAllTrades();
        const byId = {};
        trades.forEach(t => byId[String(t.id)] = t.tags);
        document.querySelectorAll('.trade-card').forEach(card => {
            const oc = card.getAttribute('onclick') || '';
            const m = oc.match(/showTradeDetail\((\d+)\)/);
            if (!m || card.querySelector('.tag-chip')) return;
            const tags = (byId[m[1]] || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 2);
            if (!tags.length) return;
            const foot = card.querySelector('.trade-card-footer');
            if (foot) foot.insertAdjacentHTML('afterbegin', tags.map(t => `<span class="tag-chip">#${t}</span>`).join(''));
        });
    }

    // ---------- 3. sample data explorer ----------
    async function seedDemo() {
        if (!window.tvClient || !localStorage.getItem('tv_active_account_id')) {
            return showToast('Create/select an account first', 'warning');
        }
        const symbols = [['XAUUSD', 4500, 'indices'], ['EURUSD', 1.085, 'forex'], ['BTCUSD', 64000, 'crypto'], ['US30', 39000, 'indices'], ['GBPJPY', 191.2, 'forex']];
        const strats = ['Breakout', 'Pullback', 'Liquidity Sweep'];
        const emotions = ['Confident', 'Calm', 'Patient', 'FOMO'];
        const sessions = ['London', 'New York', 'Asian'];
        const now = Date.now();

        for (let i = 0; i < 28; i++) {
            const s = symbols[i % symbols.length];
            const win = Math.random() < 0.58;
            const pl = +((win ? 40 + Math.random() * 220 : -(30 + Math.random() * 130)).toFixed(2));
            const dir = Math.random() > 0.5 ? 'long' : 'short';
            const size = +(1 + Math.random() * 4).toFixed(1);
            const entry = +(s[1] * (1 + (Math.random() - 0.5) * 0.01)).toFixed(5);
            const exit = +(entry + (pl / size) * (dir === 'long' ? 1 : -1) * (s[1] > 100 ? 0.01 : 0.001)).toFixed(5);
            await db.addTrade({
                symbol: s[0], market: s[2], direction: dir,
                entryDate: new Date(now - (i * 2 + 1) * 864e5).toISOString().split('T')[0],
                entryPrice: entry, exitPrice: exit,
                stopLoss: +(entry * (dir === 'long' ? 0.995 : 1.005)).toFixed(5),
                positionSize: size, profitLoss: pl,
                rMultiple: +(pl / 60).toFixed(2),
                strategy: strats[i % strats.length],
                session: sessions[i % sessions.length],
                emotionBefore: emotions[i % emotions.length],
                discipline: 5 + Math.floor(Math.random() * 6),
                confidence: 5 + Math.floor(Math.random() * 6),
                notes: 'Sample trade for exploring TradeVault.',
                tags: 'DEMO'
            });
        }
        showToast('Sample data loaded — explore! ✨');
        if (typeof app !== 'undefined') app.init();
    }

    function injectDemoBtn() {
        const empty = document.querySelector('#statsGrid .empty-state, #journalGrid .empty-state');
        if (!empty || document.getElementById('demoBtn')) return;
        const b = document.createElement('button');
        b.id = 'demoBtn';
        b.className = 'btn btn-secondary demo-btn';
        b.textContent = '✨ Explore with sample data';
        b.onclick = seedDemo;
        empty.appendChild(b);
    }

    // ---------- boot + hooks ----------
    function hook() {
        if (typeof trades !== 'undefined' && !trades.__aliveHooked) {
            trades.__aliveHooked = true;
            const ol = trades.loadTrades.bind(trades);
            trades.loadTrades = async function () { const r = await ol(); tagChips(); injectDemoBtn(); return r; };
        }
        if (typeof dashboard !== 'undefined' && !dashboard.__aliveHooked2) {
            dashboard.__aliveHooked2 = true;
            const od = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await od(); injectDemoBtn(); return r; };
        }
    }
    function boot() { hook(); tagChips(); injectDemoBtn(); }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
})();
