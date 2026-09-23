// ============ TradeVault UX: real account balance + skeleton loaders ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .skel-wrap { display: grid; gap: 1rem; margin: 0 0 1.5rem; }
        .skel-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .skel-row.two { grid-template-columns: 1fr 1fr; }
        .skel-row.three { grid-template-columns: repeat(3, 1fr); }
        .skel { border-radius: 14px; background: linear-gradient(90deg, rgba(255,255,255,.05) 25%, rgba(255,255,255,.11) 50%, rgba(255,255,255,.05) 75%); background-size: 200% 100%; animation: skelShimmer 1.1s linear infinite; }
        html[data-theme="light"] .skel { background: linear-gradient(90deg, rgba(20,22,40,.06) 25%, rgba(20,22,40,.12) 50%, rgba(20,22,40,.06) 75%); background-size: 200% 100%; }
        .skel.h1 { height: 92px; } .skel.h2 { height: 230px; } .skel.h3 { height: 150px; } .skel.line { height: 42px; }
        @keyframes skelShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (max-width: 768px) { .skel-row, .skel-row.three { grid-template-columns: 1fr 1fr; } .skel-row.two { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(st);

    /* ================= 1. ACTIVE-ACCOUNT BALANCE SYNC ================= */
    async function syncBalance() {
        const main = document.getElementById('mainContent');
        if (!(main && main.style.display === 'block') || !window.tvClient || typeof db === 'undefined') return;
        const accId = localStorage.getItem('tv_active_account_id');
        if (!accId) return;
        const { data: a } = await tvClient.from('trading_accounts').select('starting_balance').eq('id', accId).single();
        if (!a) return;
        const trades = await db.getAllTrades();
        const start = parseFloat(a.starting_balance) || 0;
        const bal = start + trades.reduce((s, t) => s + (t.profitLoss || 0), 0);
        document.querySelectorAll('.today-card, .stat-card').forEach(card => {
            const label = ((card.querySelector('.stat-label, .today-label') || {}).textContent || '').toUpperCase();
            if (!label.includes('CURRENT BALANCE')) return;
            const val = card.querySelector('.today-value, .stat-value');
            if (val) { val.textContent = formatCurrency(bal); val.className = (val.className.replace(/text-success|text-danger/g, '') + ' ' + (bal >= start ? 'text-success' : 'text-danger')).trim(); }
            const sub = [...card.querySelectorAll('*')].find(el => el.children.length === 0 && /starting:/i.test(el.textContent || ''));
            if (sub) sub.textContent = 'Starting: ' + formatCurrency(start);
        });
    }

    /* ================= 2. SKELETON LOADERS ================= */
    function skeletonHTML(secId) {
        if (secId === 'dashboard') return `<div class="skel-wrap"><div class="skel-row"><div class="skel h1"></div><div class="skel h1"></div><div class="skel h1"></div><div class="skel h1"></div></div><div class="skel h2"></div><div class="skel-row two"><div class="skel h3"></div><div class="skel h3"></div></div></div>`;
        if (secId === 'journal') return `<div class="skel-wrap"><div class="skel-row three"><div class="skel h3"></div><div class="skel h3"></div><div class="skel h3"></div></div><div class="skel-row three"><div class="skel h3"></div><div class="skel h3"></div><div class="skel h3"></div></div></div>`;
        if (secId === 'trades') return `<div class="skel-wrap"><div class="skel line"></div><div class="skel line"></div><div class="skel line"></div><div class="skel line"></div><div class="skel line"></div><div class="skel line"></div></div>`;
        if (secId === 'analytics' || secId === 'calculators' || secId === 'strategies' || secId === 'goals') return `<div class="skel-wrap"><div class="skel-row two"><div class="skel h2"></div><div class="skel h2"></div></div><div class="skel-row two"><div class="skel h3"></div><div class="skel h3"></div></div></div>`;
        return `<div class="skel-wrap"><div class="skel-row two"><div class="skel h3"></div><div class="skel h3"></div></div><div class="skel h2"></div></div>`;
    }

    function injectSkeleton(sec) {
        if (!sec || sec.querySelector('.skel-wrap')) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = skeletonHTML(sec.id);
        const sk = wrap.firstElementChild;
        const hdr = sec.querySelector('.dash-header, .section-header');
        if (hdr) hdr.after(sk); else sec.prepend(sk);
        watchClear(sec);
    }

    function watchClear(sec) {
        let done = false;
        const kill = () => { if (done) return; done = true; sec.querySelector('.skel-wrap')?.remove(); mo.disconnect(); clearTimeout(to); };
        const mo = new MutationObserver((muts) => {
            for (const m of muts) {
                for (const n of m.addedNodes) {
                    if (n.nodeType === 1 && !n.closest('.skel-wrap') && n.className !== 'skel-wrap') return kill();
                }
            }
        });
        mo.observe(sec, { childList: true, subtree: true });
        const to = setTimeout(kill, 1400);
    }

    document.addEventListener('click', (e) => {
        const nav = e.target.closest('.nav-item');
        if (nav) { injectSkeleton(document.getElementById(nav.dataset.section)); return; }
        if (e.target.closest('#viewAllTradesBtn')) injectSkeleton(document.getElementById('trades'));
    }, true);

    /* ================= BOOT / HOOKS ================= */
    function boot() {
        syncBalance();
        if (typeof dashboard !== 'undefined' && !dashboard.__uxHooked) {
            dashboard.__uxHooked = true;
            const od = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await od(); syncBalance(); return r; };
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));

    const mc = document.getElementById('mainContent');
    if (mc) {
        new MutationObserver(() => {
            if (mc.style.display === 'block') {
                syncBalance();
                const active = document.querySelector('.section.active');
                if (active && !active.querySelector('.skel-wrap')) injectSkeleton(active);
            }
        }).observe(mc, { attributes: true, attributeFilter: ['style'] });
    }
    // re-sync balance when switching accounts
    const accBtn = document.getElementById('accCurrentBtn');
    if (accBtn) new MutationObserver(() => setTimeout(syncBalance, 400)).observe(accBtn, { childList: true, subtree: true, characterData: true });
})();
