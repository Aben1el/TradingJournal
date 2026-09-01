// ============ TradeVault Live Auto-Sync ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .sync-pill { display:flex; align-items:center; gap:.4rem; margin:.5rem .6rem 0; padding:.35rem .7rem; border-radius:100px; font-size:.65rem; font-weight:700; letter-spacing:.04em; background:rgba(46,189,133,.1); border:1px solid rgba(46,189,133,.35); color:#2ebd85; text-transform:uppercase; }
        .sync-pill .dot { width:7px; height:7px; border-radius:50%; background:#2ebd85; animation:syncPulse 1.6s ease infinite; }
        .sync-pill.off { background:rgba(255,255,255,.04); border-color:var(--border-color); color:var(--text-tertiary); }
        .sync-pill.off .dot { background:var(--text-tertiary); animation:none; }
        @keyframes syncPulse { 0%,100%{ box-shadow:0 0 0 0 rgba(46,189,133,.5);} 50%{ box-shadow:0 0 0 5px rgba(46,189,133,0);} }
    `;
    document.head.appendChild(st);

    const wait = () => new Promise(r => {
        if (window.tvClient) return r();
        window.addEventListener('tv-client-ready', () => r(), { once: true });
        setTimeout(() => r(), 2500);
    });

    let pill = null;
    function setPill(on, text) {
        const host = document.querySelector('.acc-switcher');
        if (!host) return;
        if (!pill) { pill = document.createElement('div'); pill.className = 'sync-pill'; host.appendChild(pill); }
        pill.classList.toggle('off', !on);
        pill.innerHTML = `<span class="dot"></span>${text}`;
    }

    async function autoImport() {
        if (!window.tvClient) return 0;
        const { data: s } = await tvClient.auth.getSession();
        if (!s.session) return 0;
        if (!localStorage.getItem('tv_active_account_id')) return 0;
        const { data } = await tvClient.from('broker_trades').select('*').eq('imported', false);
        if (!data || !data.length) return 0;
        let n = 0;
        for (const r of data) {
            await db.addTrade({
                symbol: r.symbol, direction: r.direction, profitLoss: parseFloat(r.profit),
                entryDate: r.closed_at ? new Date(r.closed_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                entryPrice: 0, exitPrice: 0, strategy: 'Broker Sync', notes: 'Auto-synced from broker', tags: 'SYNC'
            });
            await tvClient.from('broker_trades').update({ imported: true }).eq('id', r.id);
            n++;
        }
        return n;
    }

    async function tick() {
        await wait();
        if (!window.tvClient) { setPill(false, 'Sync off'); return; }
        try {
            const n = await autoImport();
            setPill(true, 'Live sync on');
            if (n > 0) {
                showToast(`🔄 ${n} trade${n > 1 ? 's' : ''} synced from your broker!`);
                if (typeof app !== 'undefined') app.init();
            }
        } catch (e) { setPill(false, 'Sync off'); }
    }

    function boot() { tick(); setInterval(tick, 30000); }
    if (document.readyState === 'complete') setTimeout(boot, 400);
    else window.addEventListener('load', () => setTimeout(boot, 400));
})();
