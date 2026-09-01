// ============ TradeVault Next Level v2 ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .conn-token { font-family: monospace; font-size: .75rem; background: rgba(255,255,255,.05); border: 1px solid var(--border-color); border-radius: 8px; padding: .5rem .7rem; color: var(--text-secondary); word-break: break-all; margin: .5rem 0; }
        .conn-row { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .6rem; }
        .conn-status { display: flex; flex-direction: column; gap: .4rem; margin-top: .9rem; font-size: .78rem; color: var(--text-secondary); }
        .conn-status .ok { color: #2ebd85; } .conn-status .wait { color: #f59e0b; }
        .onb-card { margin: 0 0 1.5rem; padding: 1.25rem 1.5rem; border-radius: 14px; border: 1px solid rgba(99,102,241,.35); background: linear-gradient(90deg, rgba(99,102,241,.12), rgba(139,92,246,.06)); animation: cardIn .5s ease backwards; }
        .onb-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .6rem; }
        .onb-head strong { font-size: .95rem; }
        #onbX { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: .9rem; }
        .onb-step { padding: .3rem 0; font-size: .85rem; color: var(--text-secondary); }
        .onb-step.done { color: #2ebd85; text-decoration: line-through; opacity: .8; }
    `;
    document.head.appendChild(st);

    const wait = () => new Promise(res => {
        if (window.tvClient) return res();
        window.addEventListener('tv-client-ready', () => res(), { once: true });
        setTimeout(() => res(), 2500);
    });

    // ================= 1. BROKER CONNECTIONS =================
    async function getKey() {
        const { data: s } = await tvClient.auth.getSession();
        if (!s.session) return null;
        let { data } = await tvClient.from('sync_keys').select('*').eq('user_id', s.session.user.id).maybeSingle();
        if (!data) {
            const { data: c } = await tvClient.from('sync_keys').insert({ user_id: s.session.user.id }).select().single();
            data = c;
        }
        return data;
    }

    function eaFile(token) {
        return `//+------------------------------------------------------------------+
//| TradeVault Sync EA — MT5                                          |
//| Posts closed trades to YOUR TradeVault inbox every 60 seconds.    |
//| MT5: Tools > Options > Expert Advisors > enable WebRequest and    |
//| add: ${TV_SUPABASE_URL}                 |
//+------------------------------------------------------------------+
#property strict
input string TV_Url   = "${TV_SUPABASE_URL}/rest/v1/broker_trades";
input string TV_Key   = "${TV_SUPABASE_ANON_KEY}";
input string TV_Token = "${token}";

datetime from = 0;

int OnInit() { from = TimeCurrent() - 2592000; Sync(); EventSetTimer(60); return INIT_SUCCEEDED; }
void OnDeinit(const int r) { EventKillTimer(); }
void OnTimer() { Sync(); }

void Sync() {
   if (!TerminalInfoInteger(TERMINAL_CONNECTED)) return;
   if (!HistorySelect(from, TimeCurrent())) return;
   for (int i = 0; i < HistoryDealsTotal(); i++) {
      ulong t = HistoryDealGetTicket(i);
      if (t == 0) continue;
      if ((long)HistoryDealGetInteger(t, DEAL_TIME) <= (long)from) continue;
      if (HistoryDealGetInteger(t, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      double profit = HistoryDealGetDouble(t, DEAL_PROFIT)
                    + HistoryDealGetDouble(t, DEAL_SWAP)
                    + HistoryDealGetDouble(t, DEAL_COMMISSION);
      string dir = (HistoryDealGetInteger(t, DEAL_TYPE) == DEAL_TYPE_SELL) ? "long" : "short";
      string body = "{\\"token\\":\\"" + TV_Token + "\\","
         + "\\"symbol\\":\\"" + HistoryDealGetString(t, DEAL_SYMBOL) + "\\","
         + "\\"direction\\":\\"" + dir + "\\","
         + "\\"profit\\":" + DoubleToString(profit, 2) + ","
         + "\\"closed_at\\":" + IntegerToString((long)HistoryDealGetInteger(t, DEAL_TIME)) + "}";
      char data[]; StringToCharArray(body, data, 0, StringLen(body), CP_UTF8);
      string headers = "apikey: " + TV_Key + "\\r\\nContent-Type: application/json\\r\\nPrefer: return=minimal\\r\\n";
      char res[]; string h;
      int code = WebRequest(TV_Url, headers, 15000, data, res, h);
      if (code == 201 || code == 200) from = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
   }
   from = TimeCurrent() - 3600;
}
//+------------------------------------------------------------------+`;
    }

    async function buildConnections() {
        await wait();
        const grid = document.querySelector('#settings .settings-grid');
        if (!grid || document.getElementById('connCard') || !window.tvClient) return;

        // remove the old static architecture card (no duplicates)
        document.querySelectorAll('.broker-status').forEach(el => {
            const c = el.closest('.settings-card');
            if (c && c.id !== 'connCard') c.remove();
        });

        const key = await getKey();
        if (!key) return;

        const card = document.createElement('div');
        card.className = 'settings-card';
        card.id = 'connCard';
        card.innerHTML = `
            <h3>Broker & Platform Connections</h3>
            <div class="conn-token" id="connToken">••••••••-••••-••••-••••-••••••••••••</div>
            <div class="conn-row">
                <button class="btn btn-secondary" id="connReveal">Reveal Token</button>
                <button class="btn btn-secondary" id="connCopy">Copy Webhook URL</button>
                <button class="btn btn-secondary" id="connEA">Download MT5 EA</button>
                <button class="btn btn-secondary" id="connRegen">Regenerate</button>
            </div>
            <div class="conn-row"><button class="btn btn-primary" id="connImport">Import Pending Syncs</button></div>
            <div class="conn-status">
                <span class="ok">● MT5 EA sync — READY (download & attach to any chart)</span>
                <span class="wait">● MT4 / Exness / cTrader — pending official bridges (server phase)</span>
                <span>● CSV import — READY (Trades page)</span>
            </div>`;
        grid.children[1] ? grid.insertBefore(card, grid.children[1]) : grid.appendChild(card);

        let revealed = false;
        card.querySelector('#connReveal').onclick = (e) => {
            revealed = !revealed;
            card.querySelector('#connToken').textContent = revealed ? key.token : '••••••••-••••-••••-••••-••••••••••••';
            e.target.textContent = revealed ? 'Hide Token' : 'Reveal Token';
        };
        card.querySelector('#connCopy').onclick = () => {
            navigator.clipboard.writeText(`${TV_SUPABASE_URL}/rest/v1/broker_trades  (token: ${key.token})`);
            showToast('Webhook copied!');
        };
        card.querySelector('#connEA').onclick = () => {
            const blob = new Blob([eaFile(key.token)], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'TradeVaultSync.mq5';
            a.click();
            showToast('EA downloaded — compile in MetaEditor, attach to a chart');
        };
        card.querySelector('#connRegen').onclick = async () => {
            const newToken = crypto.randomUUID();
            const { error } = await tvClient.from('sync_keys').update({ token: newToken }).eq('id', key.id);
            if (error) return showToast('Error: ' + error.message, 'error');
            key.token = newToken;
            revealed = true;
            card.querySelector('#connToken').textContent = newToken;
            showToast('Token regenerated — re-download the EA');
        };
        card.querySelector('#connImport').onclick = async () => {
            const { data } = await tvClient.from('broker_trades').select('*').eq('imported', false);
            if (!data || data.length === 0) return showToast('No pending syncs');
            let n = 0;
            for (const r of data) {
                await db.addTrade({
                    symbol: r.symbol, direction: r.direction, profitLoss: parseFloat(r.profit),
                    entryDate: r.closed_at ? new Date(r.closed_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    entryPrice: 0, exitPrice: 0, strategy: 'Broker Sync', notes: 'Auto-synced from MT5'
                });
                await tvClient.from('broker_trades').update({ imported: true }).eq('id', r.id);
                n++;
            }
            showToast(`Imported ${n} synced trades!`);
            if (typeof app !== 'undefined') app.init();
        };
    }

    // ================= 2. CALCULATORS =================
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

    // ================= 3. DEEPER INSIGHTS =================
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

    // ================= 4. ONBOARDING CHECKLIST =================
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

    // ================= 5. EMOTION P&L REPORT =================
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
                                <div class="insight-text"><strong>${k}:</strong> ${v.n} trades · ${formatPercentage((v.w / v.n) * 100)} win · ${formatCurrency(v.pl)}</div>
                            </div>`).join('')
                        : '<div class="smart-insight info"><div class="insight-text">Tag emotions on your trades to unlock this report.</div></div>'}
                    </div>`);
            }
            return r;
        };
    }

    // ================= 6. PWA INSTALL =================
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstall();
    });
    function showInstall() {
        if (!deferredPrompt) return;
        const f = document.querySelector('.sidebar-footer');
        if (!f || document.getElementById('installBtn')) return;
        const b = document.createElement('button');
        b.id = 'installBtn';
        b.className = 'btn btn-secondary';
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

    // ================= BOOT =================
    function boot() {
        buildConnections();
        buildCalcs();
        deepenInsights();
        buildOnboarding();
        emotionReport();
        registerSW();
        setTimeout(showInstall, 1500);
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));

    // refresh onboarding when app becomes visible
    const mc = document.getElementById('mainContent');
    if (mc) {
        const mo = new MutationObserver(() => { if (mc.style.display === 'block') buildOnboarding(); });
        mo.observe(mc, { attributes: true, attributeFilter: ['style'] });
    }
})();
