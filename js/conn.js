// ============ TradeVault Connections (pro panel) ============
(function () {
    const wait = () => new Promise(r => {
        if (window.tvClient) return r();
        window.addEventListener('tv-client-ready', () => r(), { once: true });
        setTimeout(() => r(), 2500);
    });

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
      uchar data[]; StringToCharArray(body, data, 0, StringLen(body), CP_UTF8);
      string headers = "apikey: " + TV_Key + "\\r\\nContent-Type: application/json\\r\\nPrefer: return=minimal\\r\\n";
      uchar res[]; string h;
      int code = WebRequest(TV_Url, headers, 15000, data, res, h);
      if (code == 201 || code == 200) from = (datetime)HistoryDealGetInteger(t, DEAL_TIME) + 1;
   }
}
//+------------------------------------------------------------------+`;
    }

    async function getKey() {
        const { data: s } = await tvClient.auth.getSession();
        if (!s.session) return null;
        const sel = await tvClient.from('sync_keys').select('*').eq('user_id', s.session.user.id).maybeSingle();
        if (sel.error) return { __err: sel.error.message };
        if (sel.data) return sel.data;
        const ins = await tvClient.from('sync_keys').insert({ user_id: s.session.user.id }).select().single();
        if (ins.error) return { __err: ins.error.message };
        return ins.data;
    }

    async function build() {
        await wait();
        const grid = document.querySelector('#settings .settings-grid');
        if (!grid || !window.tvClient) return;
        const old = document.getElementById('connCard');
        if (old) old.remove();
        document.querySelectorAll('.broker-status').forEach(el => {
            const c = el.closest('.settings-card');
            if (c && c.id !== 'connCard') c.remove();
        });

        const key = await getKey();
        const card = document.createElement('div');
        card.className = 'settings-card'; card.id = 'connCard';

        if (!key || key.__err) {
            card.innerHTML = `<h3>Broker & Platform Connections</h3>
                <p class="conn-sub">⚠️ Sync tables not ready${key && key.__err ? ` (${key.__err})` : ''}. Run the sync SQL (sync_keys + broker_trades) in Supabase → SQL Editor, then refresh.</p>`;
        } else {
            card.innerHTML = `
                <h3>Broker & Platform Connections</h3>
                <p class="conn-sub">Link MetaTrader 5 once — every closed trade then syncs into TradeVault automatically.</p>
                <div class="conn-grid">
                    <div class="conn-block">
                        <div class="conn-block-head">
                            <span class="conn-ico">🔑</span>
                            <div><strong>Connection / API Information</strong><small>Your personal secure bridge credentials</small></div>
                        </div>
                        <div>
                            <small style="display:block;color:var(--text-tertiary);font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem;">API Token — sensitive</small>
                            <div class="conn-cred">
                                <code id="connToken">••••••••••••••••••••••</code>
                                <button class="conn-mini" id="connReveal">Reveal</button>
                            </div>
                        </div>
                        <div class="conn-actions">
                            <button class="btn btn-secondary" id="connCopy">Copy Webhook URL</button>
                            <button class="btn btn-secondary" id="connEA">Download MT5 EA</button>
                            <button class="btn btn-secondary" id="connRegen">Regenerate</button>
                        </div>
                    </div>
                    <div class="conn-block">
                        <div class="conn-block-head">
                            <span class="conn-ico">🔄</span>
                            <div><strong>Sync / Import</strong><small>How your trades reach TradeVault</small></div>
                        </div>
                        <div class="conn-stat"><span class="conn-dot ok"></span><div><strong>MT5 EA Sync</strong><em class="ok">Ready</em><small>Runs on desktop or VPS · pushes closed trades every 60s · auto-imports here every 30s.</small></div></div>
                        <div class="conn-stat"><span class="conn-dot warn"></span><div><strong>Mobile</strong><em class="warn">VPS / CSV</em><small>Phone apps can't run EAs — keep the EA on a VPS, or import manually via CSV.</small></div></div>
                        <div class="conn-stat"><span class="conn-dot ok"></span><div><strong>CSV Import</strong><em class="ok">Ready</em><small>Trades page → Import CSV (Exness, MT4/5, any broker).</small></div></div>
                        <button class="btn btn-primary conn-cta" id="connImport">⚡ Import Pending Syncs</button>
                    </div>
                </div>`;
        }
        grid.children[1] ? grid.insertBefore(card, grid.children[1]) : grid.appendChild(card);
        if (!key || key.__err) return;

        let revealed = false;
        card.querySelector('#connReveal').onclick = (e) => {
            revealed = !revealed;
            card.querySelector('#connToken').textContent = revealed ? key.token : '••••••••••••••••••••••';
            e.target.textContent = revealed ? 'Hide' : 'Reveal';
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
            showToast('EA downloaded ✅');
        };
        card.querySelector('#connRegen').onclick = async () => {
            const newToken = crypto.randomUUID();
            const { error } = await tvClient.from('sync_keys').update({ token: newToken }).eq('id', key.id);
            if (error) return showToast('Error: ' + error.message, 'error');
            key.token = newToken; revealed = true;
            card.querySelector('#connToken').textContent = newToken;
            card.querySelector('#connReveal').textContent = 'Hide';
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
                    entryPrice: 0, exitPrice: 0, strategy: 'Broker Sync', notes: 'Auto-synced from broker', tags: 'SYNC'
                });
                await tvClient.from('broker_trades').update({ imported: true }).eq('id', r.id);
                n++;
            }
            showToast(`Imported ${n} synced trades!`);
            if (typeof app !== 'undefined') app.init();
        };
    }

    if (document.readyState === 'complete') setTimeout(build, 400);
    else window.addEventListener('load', () => setTimeout(build, 400));
})();
