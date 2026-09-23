// ============ TradeVault UX: Perfect Skeletons + Balance Sync ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .skel-wrap { display: grid; gap: 1rem; margin: 0 0 1.5rem; }
        .skel-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .skel-row.two { grid-template-columns: 1fr 1fr; }
        .skel-row.three { grid-template-columns: repeat(3, 1fr); }
        
        /* Base shimmer */
        .skel { background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 75%); background-size: 200% 100%; animation: skelShimmer 1.2s linear infinite; border-radius: 8px; }
        html[data-theme="light"] .skel { background: linear-gradient(90deg, rgba(20,22,40,.04) 25%, rgba(20,22,40,.08) 50%, rgba(20,22,40,.04) 75%); }
        @keyframes skelShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* Stat Card Skeleton */
        .skel.stat { height: 92px; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; border-radius: 14px; border: 1px solid var(--border-color); }
        .skel.stat .l1 { height: 10px; width: 40%; }
        .skel.stat .l2 { height: 24px; width: 60%; margin-top: .5rem; }
        .skel.stat .l3 { height: 8px; width: 30%; margin-top: .5rem; }

        /* Calculator Card Skeleton */
        .skel.calc { height: 320px; padding: 1.2rem; border-radius: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: .8rem; }
        .skel.calc .title { height: 18px; width: 70%; margin-bottom: .5rem; }
        .skel.calc .lbl { height: 10px; width: 30%; }
        .skel.calc .inp { height: 42px; width: 100%; border-radius: 10px; }
        .skel.calc .btn { height: 38px; width: 100px; margin-top: auto; border-radius: 10px; background: rgba(99,102,241,.15); }

        /* Journal Card Skeleton */
        .skel.jcard { height: 140px; padding: 1rem; border-radius: 14px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; }
        .skel.jcard .top { display: flex; justify-content: space-between; }
        .skel.jcard .top .sym { height: 16px; width: 30%; }
        .skel.jcard .top .pl { height: 16px; width: 25%; }
        .skel.jcard .mid { display: flex; gap: .5rem; }
        .skel.jcard .mid .tag { height: 20px; width: 20%; border-radius: 100px; }
        .skel.jcard .bot { height: 10px; width: 40%; }

        @media (max-width: 768px) { .skel-row, .skel-row.three { grid-template-columns: 1fr 1fr; } .skel-row.two { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(st);

    /* ================= 1. BALANCE SYNC ================= */
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

    /* ================= 2. PERFECT SKELETONS ================= */
    function skeletonHTML(secId) {
        if (secId === 'dashboard') {
            return `<div class="skel-row">
                ${[1,2,3,4].map(i => `<div class="skel stat"><div class="skel l1"></div><div class="skel l2"></div><div class="skel l3"></div></div>`).join('')}
            </div>
            <div class="skel" style="height:230px; border-radius:14px; border:1px solid var(--border-color);"></div>
            <div class="skel-row two">
                <div class="skel" style="height:150px; border-radius:14px; border:1px solid var(--border-color);"></div>
                <div class="skel" style="height:150px; border-radius:14px; border:1px solid var(--border-color);"></div>
            </div>`;
        }
        if (secId === 'calculators') {
            return `<div class="skel-row three">
                ${[1,2,3].map(i => `<div class="skel calc"><div class="skel title"></div><div class="skel lbl"></div><div class="skel inp"></div><div class="skel lbl"></div><div class="skel inp"></div><div class="skel lbl"></div><div class="skel inp"></div><div class="skel btn"></div></div>`).join('')}
            </div>
            <div class="skel-row two">
                ${[1,2].map(i => `<div class="skel calc"><div class="skel title"></div><div class="skel lbl"></div><div class="skel inp"></div><div class="skel lbl"></div><div class="skel inp"></div><div class="skel btn"></div></div>`).join('')}
            </div>`;
        }
        if (secId === 'journal') {
            return `<div class="skel-row three">
                ${[1,2,3,4,5,6].map(i => `<div class="skel jcard"><div class="top"><div class="skel sym"></div><div class="skel pl"></div></div><div class="mid"><div class="skel tag"></div><div class="skel tag"></div></div><div class="skel bot"></div></div>`).join('')}
            </div>`;
        }
        if (secId === 'trades') return `<div class="skel-row"><div class="skel" style="height:42px; border-radius:8px;"></div></div>`.repeat(6);
        return `<div class="skel-row two"><div class="skel" style="height:150px; border-radius:14px;"></div><div class="skel" style="height:150px; border-radius:14px;"></div></div>`;
    }

    function showSkeleton(sec) {
        if (!sec) return;
        let wrap = sec.querySelector('.skel-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'skel-wrap';
            const header = sec.querySelector('.section-header, .dash-header');
            if (header) header.after(wrap); else sec.prepend(wrap);
        }
        wrap.innerHTML = skeletonHTML(sec.id);

        const header = sec.querySelector('.section-header, .dash-header');
        [...sec.children].forEach(child => {
            if (child !== header && child !== wrap && !child.classList.contains('skel-wrap')) {
                child.dataset.skelHidden = '1';
                child.style.display = 'none';
            }
        });
    }

    function hideSkeleton(sec) {
        const wrap = sec.querySelector('.skel-wrap');
        if (wrap) wrap.remove();
        sec.querySelectorAll('[data-skel-hidden="1"]').forEach(el => {
            el.style.display = '';
            delete el.dataset.skelHidden;
        });
    }

    function triggerSkeleton(sec) {
        if (!sec) return;
        showSkeleton(sec);
        setTimeout(() => hideSkeleton(sec), 700); // 700ms feels premium
    }

    document.addEventListener('click', (e) => {
        const nav = e.target.closest('.nav-item');
        if (nav) {
            const sec = document.getElementById(nav.dataset.section);
            if (sec) triggerSkeleton(sec);
        }
    }, true);

    /* ================= BOOT ================= */
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
    if (mc) new MutationObserver(() => { if (mc.style.display === 'block') syncBalance(); }).observe(mc, { attributes: true, attributeFilter: ['style'] });
})();
