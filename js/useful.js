// ============ TradeVault Useful Pack: hints + FAB + collapsed pill ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        body.sb-collapsed .sync-pill { font-size: 0; justify-content: center; align-items: center; width: 26px; height: 26px; border-radius: 50%; margin: .6rem auto 0; padding: 0; }
        body.sb-collapsed .sync-pill .dot { margin: 0; }
        .stat-card[title], .today-card[title] { cursor: help; }
        .tv-fab { position: fixed; bottom: 5rem; right: 1.25rem; z-index: 96; width: 54px; height: 54px; border-radius: 50%; background: var(--accent-gradient); color: #fff; border: none; font-size: 1.6rem; font-weight: 700; display: none; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(99,102,241,.45); transition: transform .2s ease; }
        .tv-fab:active { transform: scale(.92); }
        @media (max-width: 768px) { .tv-fab { display: flex; } }
    `;
    document.head.appendChild(st);

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

    function boot() {
        applyHints(); fab();
        if (typeof dashboard !== 'undefined' && !dashboard.__usefulHooked) {
            dashboard.__usefulHooked = true;
            const od = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await od(); applyHints(); fab(); return r; };
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
    const mc = document.getElementById('mainContent');
    if (mc) new MutationObserver(() => { if (mc.style.display === 'block') { applyHints(); fab(); } }).observe(mc, { attributes: true, attributeFilter: ['style'] });
})();
