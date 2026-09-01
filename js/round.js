// ============ TradeVault Round: layout fix + quote + streak ============
(function () {
    const wait = () => new Promise(r => {
        if (window.tvClient) return r();
        window.addEventListener('tv-client-ready', () => r(), { once: true });
        setTimeout(() => r(), 2500);
    });

    // ---------- 1. achievements: move to the middle, centered ----------
    function fixAch() {
        const right = document.querySelector('.profile-right');
        if (!right) return;
        let ach = document.querySelector('.badge-grid-wrap');
        if (!ach) {
            const h = [...document.querySelectorAll('h3')].find(x => x.textContent.trim() === 'Achievements');
            if (h) { ach = h.parentElement; ach.classList.add('badge-grid-wrap'); }
        }
        if (!ach || ach.dataset.fixed) return;
        ach.dataset.fixed = '1';
        const edit = right.querySelector('.edit-card');
        if (edit && ach.parentElement !== right) right.insertBefore(ach, edit);
        else if (!edit) right.appendChild(ach);
        else if (ach.parentElement === right) right.insertBefore(ach, edit);
    }

    // ---------- 2. daily quote ----------
    const QUOTES = [
        ['The market transfers money from the impatient to the patient.', 'Warren Buffett'],
        ['Risk comes from not knowing what you are doing.', 'Warren Buffett'],
        ['Plan the trade, trade the plan.', 'Trading Wisdom'],
        ['Amateurs think about how much they can make. Professionals think about how much they can lose.', 'Jack Schwager'],
        ['Discipline is choosing between what you want now and what you want most.', 'Abraham Lincoln'],
        ['The goal is not to be right. The goal is to be profitable over time.', 'Trading Wisdom'],
        ['Journaling turns experience into edge.', 'TradeVault'],
        ['Losses are tuition — every red trade teaches, if you listen.', 'Trading Wisdom'],
        ['Consistency beats intensity in trading.', 'Trading Wisdom'],
        ['Your best trade setup is a rested mind.', 'Trading Wisdom']
    ];
    function quoteCard() {
        const dash = document.getElementById('dashboard');
        const main = document.getElementById('mainContent');
        if (!dash || document.getElementById('quoteCard')) return;
        if (!(main && main.style.display === 'block')) return;
        const d = new Date();
        const idx = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % QUOTES.length;
        const el = document.createElement('div');
        el.id = 'quoteCard'; el.className = 'quote-card';
        el.innerHTML = `“${QUOTES[idx][0]}” — <b>${QUOTES[idx][1]}</b>`;
        const week = document.getElementById('weekCard');
        if (week) week.after(el); else dash.querySelector('.dash-header').after(el);
    }

    // ---------- 3. streak flame in sidebar ----------
    async function streakChip() {
        const nameEl = document.getElementById('sidebarUserName');
        if (!nameEl || document.getElementById('streakChip') || typeof db === 'undefined') return;
        const trades = await db.getAllTrades();
        if (!trades.length) return;
        const s = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
        let cur = 0;
        for (const t of s) { cur = t.profitLoss > 0 ? cur + 1 : 0; }
        if (cur >= 2) {
            const c = document.createElement('span');
            c.id = 'streakChip'; c.className = 'streak-chip';
            c.textContent = '🔥 ' + cur;
            nameEl.after(c);
        }
    }

    function boot() { fixAch(); quoteCard(); streakChip(); }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));

    const mc = document.getElementById('mainContent');
    if (mc) new MutationObserver(() => { if (mc.style.display === 'block') { quoteCard(); streakChip(); } }).observe(mc, { attributes: true, attributeFilter: ['style'] });
})();
