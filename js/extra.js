// ============ TradeVault Extra (clean rebuild) ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .onb-card { margin: 0 0 1.5rem; padding: 1.25rem 1.5rem; border-radius: 14px; border: 1px solid rgba(99,102,241,.35); background: linear-gradient(90deg, rgba(99,102,241,.12), rgba(139,92,246,.06)); animation: cardIn .5s ease backwards; }
        .onb-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .6rem; }
        .onb-head strong { font-size: .95rem; }
        #onbX { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: .9rem; }
        .onb-step { padding: .3rem 0; font-size: .85rem; color: var(--text-secondary); }
        .onb-step.done { color: #2ebd85; text-decoration: line-through; opacity: .8; }
    `;
    document.head.appendChild(st);

    const wait = () => new Promise(r => {
        if (window.tvClient) return r();
        window.addEventListener('tv-client-ready', () => r(), { once: true });
        setTimeout(() => r(), 2500);
    });
    const sum = a => a.reduce((s, t) => s + (t.profitLoss || 0), 0);
    const wr = a => a.length ? Math.round(a.filter(t => t.profitLoss > 0).length / a.length * 100) : 0;

    document.querySelectorAll('img').forEach(i => { if (!i.loading) i.loading = 'lazy'; });

    /* ---------- extra calculators ---------- */
    function buildCalcs() {
        const grid = document.querySelector('.calculators-grid');
        if (!grid || grid.dataset.tvx) return;
        grid.dataset.tvx = '1';
        grid.insertAdjacentHTML('beforeend', `
            <div class="calculator-card">
                <h3>Potential P&L Calculator</h3>
                <div class="calculator-form">
                    <div class="form-group"><label>Entry Price</label><input type="number" step="0.00001" id="ppEntry" placeholder="100.50"></div>
                    <div class="form-group"><label>Exit Price</label><input type="number" step="0.00001" id="ppExit" placeholder="103.50"></div>
                    <div class="form-group"><label>Position Size (units)</label><input type="number" step="0.01" id="ppSize" placeholder="1"></div>
                    <div class="form-group"><label>Direction</label><select id="ppDir"><option value="long">Long</option><option value="short">Short</option></select></div>
                    <button class="btn btn-primary" id="ppBtn">Calculate</button>
                    <div class="calculator-result" id="ppResult"></div>
                </div>
            </div>
            <div class="calculator-card">
                <h3>Drawdown Calculator</h3>
                <div class="calculator-form">
                    <div class="form-group"><label>Peak Balance ($)</label><input type="number" step="0.01" id="ddPeak" placeholder="11000"></div>
                    <div class="form-group"><label>Current Balance ($)</label><input type="number" step="0.01" id="ddCur" placeholder="10400"></div>
                    <button class="btn btn-primary" id="ddBtn">Calculate</button>
                    <div class="calculator-result" id="ddResult"></div>
                </div>
            </div>`);
        document.getElementById('ppBtn').onclick = () => {
            const e = parseFloat(document.getElementById('ppEntry').value), x = parseFloat(document.getElementById('ppExit').value),
                s = parseFloat(document.getElementById('ppSize').value), d = document.getElementById('ppDir').value;
            if (isNaN(e) || isNaN(x) || isNaN(s)) return showToast('Fill all fields', 'warning');
            const pl = (x - e) * s * (d === 'long' ? 1 : -1);
            document.getElementById('ppResult').innerHTML = `<div class="result-item"><span class="result-label">Potential P&L</span><span class="result-value ${pl >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(pl)}</span></div>`;
        };
        document.getElementById('ddBtn').onclick = () => {
            const p = parseFloat(document.getElementById('ddPeak').value), c = parseFloat(document.getElementById('ddCur').value);
            if (isNaN(p) || isNaN(c) || p <= 0) return showToast('Fill all fields', 'warning');
            const dd = Math.max(0, p - c), pct = (dd / p) * 100;
            document.getElementById('ddResult').innerHTML = `<div class="result-item"><span class="result-label">Drawdown</span><span class="result-value text-danger">${formatCurrency(dd)}</span></div><div class="result-item"><span class="result-label">Drawdown %</span><span class="result-value text-danger">${formatPercentage(pct)}</span></div>`;
        };
    }

    /* ---------- deeper smart insights ---------- */
    function deepenInsights() {
        if (typeof analytics === 'undefined' || analytics.__deep) return;
        analytics.__deep = true;
        const orig = analytics.getSmartInsights.bind(analytics);
        analytics.getSmartInsights = function (trades) {
            const out = orig(trades);
            if (!trades || trades.length < 6) return out;
            const sess = {};
            trades.forEach(t => { if (t.session) { sess[t.session] = sess[t.session] || { n: 0, w: 0 }; sess[t.session].n++; if (t.profitLoss > 0) sess[t.session].w++; } });
            const se = Object.entries(sess).filter(([, v]) => v.n >= 3).map(([k, v]) => [k, v.w / v.n]);
            if (se.length >= 2) {
                se.sort((a, b) => b[1] - a[1]);
                const diff = Math.round((se[0][1] - se[se.length - 1][1]) * 100);
                if (diff >= 10) out.push({ type: 'success', text: `Your win rate is ${diff}% higher during ${se[0][0]}-session trades than ${se[se.length - 1][0]}.` });
            }
            const days = {};
            trades.forEach(t => { const k = String(t.entryDate).split('T')[0]; days[k] = days[k] || { n: 0, pl: 0 }; days[k].n++; days[k].pl += t.profitLoss; });
            const heavy = Object.values(days).filter(d => d.n >= 5);
            if (heavy.length) {
                const avgHeavy = heavy.reduce((s, d) => s + d.pl / d.n, 0) / heavy.length;
                const light = Object.values(days).filter(d => d.n < 5);
                const avgLight = light.length ? light.reduce((s, d) => s + d.pl / d.n, 0) / light.length : 0;
                if (avgHeavy < avgLight) out.push({ type: 'warning', text: `On days with 5+ trades you average ${formatCurrency(avgHeavy)} per trade vs ${formatCurrency(avgLight)} on lighter days — possible overtrading.` });
            }
            const ls = { long: { n: 0, w: 0 }, short: { n: 0, w: 0 } };
            trades.forEach(t => { if (ls[t.direction]) { ls[t.direction].n++; if (t.profitLoss > 0) ls[t.direction].w++; } });
            if (ls.long.n >= 3 && ls.short.n >= 3) {
                const dl = Math.round(((ls.long.w / ls.long.n) - (ls.short.w / ls.short.n)) * 100);
                if (Math.abs(dl) >= 10) out.push({ type: 'info', text: `You win ${Math.abs(dl)}% more often on ${dl > 0 ? 'longs' : 'shorts'}. Consider sizing that side with more confidence.` });
            }
            const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
            let maxL = 0, cur = 0;
            sorted.forEach(t => { cur = t.profitLoss < 0 ? cur + 1 : 0; maxL = Math.max(maxL, cur); });
            if (maxL >= 3) out.push({ type: 'warning', text: `Your longest losing streak is ${maxL} trades. Review those trades for revenge-trading patterns.` });
            return out;
        };
    }

    /* ---------- onboarding checklist ---------- */
    async function buildOnboarding() {
        await wait();
        const dash = document.getElementById('dashboard');
        const main = document.getElementById('mainContent');
        if (!dash || !window.tvClient || document.getElementById('onbCard')) return;
        if (localStorage.getItem('tv_onb_dismissed') === '1') return;
        if (!(main && main.style.display === 'block')) return;
        const [trades, reviews, accs] = await Promise.all([
            db.getAllTrades(), db.getAllReviews(), tvClient.from('trading_accounts').select('id')
        ]);
        const steps = [
            { t: 'Create your trading account', ok: (accs.data || []).length > 0 },
            { t: 'Record your first trade', ok: trades.length > 0 },
            { t: 'Write your first review', ok: reviews.length > 0 }
        ];
        if (steps.every(s => s.ok)) return;
        const card = document.createElement('div');
        card.id = 'onbCard'; card.className = 'onb-card';
        card.innerHTML = `<div class="onb-head"><strong>🚀 Get started with TradeVault</strong><button id="onbX" title="Dismiss">✕</button></div>` +
            steps.map(s => `<div class="onb-step ${s.ok ? 'done' : ''}">${s.ok ? '✅' : '○'} ${s.t}</div>`).join('');
        dash.querySelector('.dash-header').after(card);
        card.querySelector('#onbX').onclick = () => { localStorage.setItem('tv_onb_dismissed', '1'); card.remove(); };
    }

    /* ---------- emotion P&L report ---------- */
    function emotionReport() {
        if (typeof psychology === 'undefined' || psychology.__emo) return;
        psychology.__emo = true;
        const orig = psychology.loadPsychology.bind(psychology);
        psychology.loadPsychology = async function (...a) {
            const r = await orig(...a);
            const grid = document.querySelector('.psychology-grid');
            if (grid && !document.getElementById('emoCard')) {
                const trades = await db.getAllTrades();
                const by = {};
                trades.forEach(t => {
                    if (t.emotionBefore) {
                        const k = t.emotionBefore;
                        by[k] = by[k] || { n: 0, pl: 0, w: 0 };
                        by[k].n++; by[k].pl += t.profitLoss; if (t.profitLoss > 0) by[k].w++;
                    }
                });
                const rows = Object.entries(by).sort((x, y) => y[1].pl - x[1].pl);
                grid.insertAdjacentHTML('beforeend', `
                    <div class="insights-container" id="emoCard">
                        <h3>Emotion P&L Report</h3>
                        ${rows.length ? rows.map(([k, v]) => `
                            <div class="smart-insight ${v.pl >= 0 ? 'success' : 'danger'}">
                                <div class="insight-text"><strong>${k}:</strong> ${v.n} trades · ${Math.round((v.w / v.n) * 100)}% win · ${formatCurrency(v.pl)}</div>
                            </div>`).join('')
                        : '<div class="smart-insight info"><div class="insight-text">Tag emotions on your trades to unlock this report.</div></div>'}
                    </div>`);
            }
            return r;
        };
    }

    /* ---------- PWA install ---------- */
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; showInstall(); });
    function showInstall() {
        if (!deferredPrompt) return;
        const f = document.querySelector('.sidebar-footer');
        if (!f || document.getElementById('installBtn')) return;
        const b = document.createElement('button');
        b.id = 'installBtn'; b.className = 'btn btn-secondary';
        b.style.cssText = 'width:100%;margin-top:.6rem;border-radius:12px;';
        b.textContent = '📲 Install TradeVault App';
        b.onclick = async () => { deferredPrompt.prompt(); deferredPrompt = null; b.remove(); };
        f.appendChild(b);
    }
    function registerSW() {
        if ('serviceWorker' in navigator && location.protocol === 'https:') {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    }

    function boot() {
        buildCalcs();
        deepenInsights();
        buildOnboarding();
        emotionReport();
        registerSW();
        setTimeout(showInstall, 1500);
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));

    const mc = document.getElementById('mainContent');
    if (mc) new MutationObserver(() => { if (mc.style.display === 'block') buildOnboarding(); }).observe(mc, { attributes: true, attributeFilter: ['style'] });
})();
