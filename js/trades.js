// ============ TradeVault Trades Module v2 — single unified flow ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .tf-sec { margin: 1.1rem 0 .6rem; font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-secondary); }
        .tf-sec small { color: var(--text-tertiary); text-transform: none; letter-spacing: 0; }
        .tf-calc { padding: .6rem .9rem; border-radius: 12px; background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.25); font-size: .78rem; color: var(--text-secondary); margin-bottom: .9rem; }
        .tf-mistakes { display: flex; gap: .9rem; flex-wrap: wrap; margin: .4rem 0 .2rem; }
        .tf-mk { display: flex; align-items: center; gap: .4rem; font-size: .78rem; color: var(--text-secondary); cursor: pointer; }
        .tf-mk input { accent-color: #6366f1; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .9rem; }
        @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(st);

    const trades = {
        filters: { search: '', strategy: 'all', result: 'all', session: 'all', dir: 'all', from: '', to: '' },
        page: 1, perPage: 10,

        async all() { let t = await db.getAllTrades(); if (window.tvTradeFilterFn) t = t.filter(window.tvTradeFilterFn); return t; },

        applyFilters(list) {
            const f = this.filters;
            return list.filter(t => {
                if (f.search && !((t.symbol || '') + (t.strategy || '') + (t.tags || '')).toLowerCase().includes(f.search.toLowerCase())) return false;
                if (f.strategy !== 'all' && t.strategy !== f.strategy) return false;
                if (f.result === 'win' && !(t.profitLoss > 0)) return false;
                if (f.result === 'loss' && !(t.profitLoss < 0)) return false;
                if (f.session !== 'all' && t.session !== f.session) return false;
                if (f.dir !== 'all' && t.direction !== f.dir) return false;
                if (f.from && new Date(t.entryDate) < new Date(f.from)) return false;
                if (f.to && new Date(t.entryDate) > new Date(f.to + 'T23:59:59')) return false;
                return true;
            });
        },

        async loadTrades() {
            this.ensureFilters();
            const list = this.applyFilters(await this.all()).sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
            const jg = document.getElementById('journalGrid');
            if (jg) jg.innerHTML = list.length ? list.slice(0, 12).map(t => this.cardHTML(t)).join('') : '<div class="empty-state"><h3>No trades yet</h3><p>Start building your trading history and your performance insights will appear here.</p></div>';
            const tb = document.querySelector('#tradesTable tbody');
            const pages = Math.max(1, Math.ceil(list.length / this.perPage));
            if (this.page > pages) this.page = pages;
            const slice = list.slice((this.page - 1) * this.perPage, this.page * this.perPage);
            if (tb) tb.innerHTML = slice.length ? slice.map(t => this.rowHTML(t)).join('') : '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-tertiary);">No trades match your filters.</td></tr>';
            const pg = document.getElementById('tradesPagination');
            if (pg) pg.innerHTML = pages > 1 ? `<button class="btn btn-text" ${this.page === 1 ? 'disabled' : ''} onclick="trades.goto(${this.page - 1})">←</button><span style="font-size:.8rem;color:var(--text-secondary);">Page ${this.page} / ${pages}</span><button class="btn btn-text" ${this.page === pages ? 'disabled' : ''} onclick="trades.goto(${this.page + 1})">→</button>` : '';
        },
        goto(p) { this.page = p; this.loadTrades(); },

        cardHTML(t) {
            return `<div class="trade-card ${t.profitLoss >= 0 ? 'win' : 'loss'}" onclick="trades.showTradeDetail(${t.id})">
                <div class="trade-card-header"><span class="trade-symbol">${t.symbol}</span><span class="trade-pl ${t.profitLoss >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(t.profitLoss)}</span></div>
                <div class="trade-card-body"><div class="trade-meta"><span class="badge ${t.direction === 'long' ? 'badge-long' : 'badge-short'}">${t.direction}</span><span>${t.strategy || 'No strategy'}</span><span>${t.session || ''}</span></div></div>
                <div class="trade-card-footer"><span>${formatDate(t.entryDate)}</span><span class="${t.profitLoss >= 0 ? 'text-success' : 'text-danger'}">${t.profitLoss >= 0 ? 'WIN' : 'LOSS'}</span></div></div>`;
        },
        rowHTML(t) {
            return `<tr style="cursor:pointer" onclick="trades.showTradeDetail(${t.id})">
                <td>${formatDate(t.entryDate)}</td><td><strong>${t.symbol}</strong></td>
                <td><span class="badge ${t.direction === 'long' ? 'badge-long' : 'badge-short'}">${t.direction}</span></td>
                <td>${t.entryPrice ?? '—'}</td><td>${t.exitPrice ?? '—'}</td>
                <td class="${t.profitLoss >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(t.profitLoss)}</td>
                <td>${t.rMultiple ?? '—'}R</td><td>${t.strategy || '—'}</td>
                <td><span class="badge ${t.profitLoss >= 0 ? 'badge-long' : 'badge-short'}">${t.profitLoss >= 0 ? 'WIN' : 'LOSS'}</span></td></tr>`;
        },

        ensureFilters() {
            const bar = document.querySelector('#trades .filters-bar');
            if (!bar || bar.dataset.v2) return;
            bar.dataset.v2 = '1';
            const tagBar = document.getElementById('tvTagBar');
            bar.innerHTML = '';
            if (tagBar) bar.appendChild(tagBar);
            bar.insertAdjacentHTML('beforeend', `
                <input type="text" id="tradeSearch" placeholder="Search symbol, strategy, tag…">
                <select id="filterStrategy"><option value="all">All Strategies</option></select>
                <select id="filterResult"><option value="all">Win & Loss</option><option value="win">Wins only</option><option value="loss">Losses only</option></select>
                <select id="filterSession"><option value="all">All Sessions</option><option>London</option><option>New York</option><option>Asian</option></select>
                <select id="filterDir"><option value="all">Long & Short</option><option value="long">Long</option><option value="short">Short</option></select>
                <input type="date" id="filterFrom" title="From date">
                <input type="date" id="filterTo" title="To date">`);
            const bind = (id, key) => { const el = document.getElementById(id); if (el) el.oninput = () => { this.filters[key] = el.value; this.page = 1; this.loadTrades(); }; };
            bind('tradeSearch', 'search'); bind('filterStrategy', 'strategy'); bind('filterResult', 'result');
            bind('filterSession', 'session'); bind('filterDir', 'dir'); bind('filterFrom', 'from'); bind('filterTo', 'to');
            (async () => {
                const all = await this.all();
                const strs = [...new Set(all.map(t => t.strategy).filter(Boolean))];
                const sel = document.getElementById('filterStrategy');
                if (sel) strs.forEach(s => sel.insertAdjacentHTML('beforeend', `<option>${s}</option>`));
            })();
        },

        async showTradeModal(id) {
            const ov = document.getElementById('modalOverlay');
            if (!ov || ov.classList.contains('active')) return;
            let t = null;
            if (id) t = (await db.getAllTrades()).find(x => x.id === id) || null;
            const em = ['Confident', 'Calm', 'Patient', 'FOMO', 'Fear', 'Greedy', 'Anxious', 'Disciplined'];
            const opt = (arr, cur) => `<option value=""></option>` + arr.map(o => `<option ${o === cur ? 'selected' : ''}>${o}</option>`).join('');
            const v = k => t ? (t[k] ?? '') : '';
            ov.innerHTML = `<div class="modal"><div class="modal-header"><h2>${t ? 'Edit' : 'Add'} Trade</h2><button class="modal-close" onclick="app.closeModal()">✕</button></div>
            <div class="modal-body"><form id="tradeForm">
              <h5 class="tf-sec">Basic</h5>
              <div class="form-grid">
                <div class="form-group"><label>Symbol *</label><input class="form-control" name="symbol" required value="${v('symbol')}" placeholder="XAUUSD"></div>
                <div class="form-group"><label>Direction</label><select class="form-control" name="direction"><option value="long" ${t && t.direction === 'long' ? 'selected' : ''}>Long</option><option value="short" ${t && t.direction === 'short' ? 'selected' : ''}>Short</option></select></div>
                <div class="form-group"><label>Date *</label><input class="form-control" type="date" name="entryDate" required value="${t ? t.entryDate : new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group"><label>Session</label><select class="form-control" name="session">${opt(['London', 'New York', 'Asian'], t && t.session)}</select></div>
                <div class="form-group"><label>Timeframe</label><select class="form-control" name="timeframe">${opt(['M5', 'M15', 'M30', 'H1', 'H4', 'D1'], t && t.timeframe)}</select></div>
                <div class="form-group"><label>Leverage</label><input class="form-control" type="number" step="any" name="leverage" value="${v('leverage')}" placeholder="100"></div>
                <div class="form-group"><label>Entry Price</label><input class="form-control" type="number" step="any" name="entryPrice" value="${v('entryPrice')}"></div>
                <div class="form-group"><label>Stop Loss</label><input class="form-control" type="number" step="any" name="stopLoss" value="${v('stopLoss')}"></div>
                <div class="form-group"><label>Take Profit</label><input class="form-control" type="number" step="any" name="takeProfit" value="${v('takeProfit')}"></div>
                <div class="form-group"><label>Exit Price</label><input class="form-control" type="number" step="any" name="exitPrice" value="${v('exitPrice')}"></div>
                <div class="form-group"><label>Position Size</label><input class="form-control" type="number" step="any" name="positionSize" value="${v('positionSize')}"></div>
              </div>
              <h5 class="tf-sec">Financial <small>(auto-calculated)</small></h5>
              <div class="tf-calc" id="tfCalc">Risk: — · Reward: — · R:R: — · Risk %: —</div>
              <div class="form-grid">
                <div class="form-group"><label>Fees / Commission</label><input class="form-control" type="number" step="any" name="fees" value="${v('fees')}"></div>
                <div class="form-group"><label>Swap</label><input class="form-control" type="number" step="any" name="swap" value="${v('swap')}"></div>
                <div class="form-group"><label>Actual P&L ($) *</label><input class="form-control" type="number" step="any" name="profitLoss" required value="${v('profitLoss')}"></div>
                <div class="form-group"><label>R Multiple</label><input class="form-control" type="number" step="any" name="rMultiple" value="${v('rMultiple')}"></div>
              </div>
              <h5 class="tf-sec">Strategy & Setup</h5>
              <div class="form-grid">
                <div class="form-group"><label>Strategy</label><input class="form-control" name="strategy" list="tvStratList" value="${v('strategy')}"><datalist id="tvStratList"></datalist></div>
                <div class="form-group"><label>Setup Type</label><input class="form-control" name="setupType" value="${v('setupType')}" placeholder="Breakout, Pullback…"></div>
                <div class="form-group"><label>Market Condition</label><select class="form-control" name="marketCondition">${opt(['Trending', 'Ranging', 'Volatile', 'Quiet'], t && t.marketCondition)}</select></div>
                <div class="form-group"><label>Entry Reason</label><input class="form-control" name="entryReason" value="${v('entryReason')}"></div>
                <div class="form-group"><label>Exit Reason</label><input class="form-control" name="exitReason" value="${v('exitReason')}"></div>
              </div>
              <h5 class="tf-sec">Psychology</h5>
              <div class="form-grid">
                <div class="form-group"><label>Emotion Before</label><select class="form-control" name="emotionBefore">${opt(em, t && t.emotionBefore)}</select></div>
                <div class="form-group"><label>Emotion During</label><select class="form-control" name="emotionDuring">${opt(em, t && t.emotionDuring)}</select></div>
                <div class="form-group"><label>Emotion After</label><select class="form-control" name="emotionAfter">${opt(em, t && t.emotionAfter)}</select></div>
                <div class="form-group"><label>Confidence (1-10)</label><input class="form-control" type="number" min="1" max="10" name="confidence" value="${v('confidence')}"></div>
                <div class="form-group"><label>Discipline (1-10)</label><input class="form-control" type="number" min="1" max="10" name="discipline" value="${v('discipline')}"></div>
              </div>
              <div class="tf-mistakes">
                ${['FOMO', 'Revenge', 'Overtrading', 'Fear', 'Greed', 'Impatience'].map(m => `<label class="tf-mk"><input type="checkbox" value="${m}" ${t && (t.mistakes || '').includes(m) ? 'checked' : ''}> ${m}</label>`).join('')}
                <label class="tf-mk"><input type="checkbox" name="ruleBroken" ${t && t.ruleBroken ? 'checked' : ''}> ⚠️ Broke my rules</label>
              </div>
              <h5 class="tf-sec">Screenshots</h5>
              <div class="form-group"><input type="file" accept="image/*" multiple id="tfShots" style="font-size:.8rem;"><div id="tfShotPrev" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;"></div></div>
              <h5 class="tf-sec">Journal</h5>
              <div class="form-group"><textarea class="form-control" name="notes" rows="5" placeholder="Why did I enter? What did I expect? What happened?">${v('notes')}</textarea>
              <button type="button" class="btn btn-text" id="tfTemplate" style="min-height:auto;padding:.3rem .6rem;margin-top:.4rem;">📝 Use 6-question template</button></div>
            </form></div>
            <div class="modal-footer"><button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button><button class="btn btn-primary" id="tfSave">${t ? 'Save Changes' : 'Add Trade'}</button></div></div>`;
            ov.classList.add('active');
            this.bindForm(t);
        },

        bindForm(t) {
            const form = document.getElementById('tradeForm');
            const calc = async () => {
                const g = n => parseFloat(form.querySelector(`[name="${n}"]`)?.value);
                const entry = g('entryPrice'), stop = g('stopLoss'), tp = g('takeProfit'), size = g('positionSize'), pl = g('profitLoss');
                let bal = 10000;
                const accId = localStorage.getItem('tv_active_account_id');
                if (accId && window.tvClient) { const { data: a } = await tvClient.from('trading_accounts').select('starting_balance').eq('id', accId).single(); if (a) bal = parseFloat(a.starting_balance) || bal; }
                const risk = (entry != null && stop != null && size != null) ? Math.abs(entry - stop) * size : null;
                const rew = (entry != null && tp != null && size != null) ? Math.abs(tp - entry) * size : null;
                const rr = (risk && rew) ? (rew / risk).toFixed(2) : null;
                const rp = risk ? (risk / bal * 100).toFixed(2) : null;
                const el = document.getElementById('tfCalc');
                if (el) el.innerHTML = `Risk: <strong>${risk != null ? formatCurrency(risk) : '—'}</strong> · Reward: <strong>${rew != null ? formatCurrency(rew) : '—'}</strong> · R:R: <strong>${rr ?? '—'}</strong> · Risk: <strong>${rp != null ? rp + '%' : '—'}</strong>`;
                form.dataset.risk = risk ?? ''; form.dataset.reward = rew ?? ''; form.dataset.riskPct = rp ?? '';
                const rIn = form.querySelector('[name="rMultiple"]');
                if (risk && pl != null && document.activeElement !== rIn) rIn.value = (pl / risk).toFixed(2);
            };
            ['entryPrice', 'stopLoss', 'takeProfit', 'positionSize', 'profitLoss'].forEach(n => { const el = form.querySelector(`[name="${n}"]`); if (el) el.oninput = calc; });
            calc();
            (async () => { if (typeof db !== 'undefined') { const s = await db.getAllStrategies(); const dl = document.getElementById('tvStratList'); if (dl) (s || []).forEach(x => dl.insertAdjacentHTML('beforeend', `<option value="${x.name}">`)); } })();
            document.getElementById('tfTemplate').onclick = () => {
                const ta = form.querySelector('[name="notes"]');
                if (ta.value.trim()) return showToast('Notes already has content', 'warning');
                ta.value = 'Why did I enter?\n\nWhat did I expect?\n\nWhat actually happened?\n\nWhat did I do correctly?\n\nWhat did I do wrong?\n\nWhat will I do differently next time?\n';
            };
            const prev = document.getElementById('tfShotPrev');
            const existing = (t && t.screenshots) || [];
            const thumbs = existing.map(u => `<img src="${u}" style="width:64px;height:48px;object-fit:cover;border-radius:8px;">`).join('');
            prev.innerHTML = thumbs;
            document.getElementById('tfShots').onchange = e => { prev.innerHTML = thumbs + [...e.target.files].map(() => `<div class="skel" style="width:64px;height:48px;"></div>`).join(''); };
            const btn = document.getElementById('tfSave');
            btn.onclick = async () => {
                if (btn.disabled) return;               // ← one submission per click
                btn.disabled = true; btn.textContent = 'Saving…';
                try { await this.save(form, t, existing); } finally { btn.disabled = false; btn.textContent = t ? 'Save Changes' : 'Add Trade'; }
            };
        },

        async save(form, t, existingShots) {
            if (!form.reportValidity()) return;
            const fd = new FormData(form);
            const d = Object.fromEntries(fd.entries());
            ['entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'positionSize', 'leverage', 'fees', 'swap', 'profitLoss', 'rMultiple', 'confidence', 'discipline'].forEach(k => { if (d[k] !== '' && d[k] != null) d[k] = parseFloat(d[k]); else delete d[k]; });
            d.mistakes = [...form.querySelectorAll('.tf-mk input:checked:not([name="ruleBroken"])')].map(i => i.value).join(', ');
            d.ruleBroken = form.querySelector('[name="ruleBroken"]').checked;
            d.riskAmount = parseFloat(form.dataset.risk) || null;
            d.riskPct = parseFloat(form.dataset.riskPct) || null;
            d.potentialProfit = parseFloat(form.dataset.reward) || null;
            const files = [...document.getElementById('tfShots').files];
            let shots = [...existingShots];
            for (const f of files) {
                try {
                    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${f.name}`;
                    const { error } = await tvClient.storage.from('screenshots').upload(path, f);
                    if (!error) shots.push(tvClient.storage.from('screenshots').getPublicUrl(path).data.publicUrl);
                } catch (e) { console.warn(e); }
            }
            d.screenshots = shots;
            if (t) await db.updateTrade(Object.assign({}, d, { id: t.id }));
            else await db.addTrade(d);
            app.closeModal();
            showToast(t ? 'Trade updated ✅' : 'Trade added ✅');
            if (typeof app !== 'undefined') app.init();
        },

        async showTradeDetail(id) {
            const ov = document.getElementById('modalOverlay');
            if (!ov || ov.classList.contains('active')) return;
            const t = (await db.getAllTrades()).find(x => x.id === id);
            if (!t) return;
            const row = (k, val) => `<div><strong>${k}:</strong> ${val ?? '—'}</div>`;
            ov.innerHTML = `<div class="modal"><div class="modal-header"><h2>${t.symbol} · ${t.direction}</h2><button class="modal-close" onclick="app.closeModal()">✕</button></div>
            <div class="modal-body"><div class="trade-detail">
              <div class="trade-detail-section"><h4>Trade</h4><div class="trade-detail-grid">
                ${row('Date', formatDate(t.entryDate))}${row('Session', t.session)}${row('Timeframe', t.timeframe)}${row('Entry', t.entryPrice)}${row('Stop', t.stopLoss)}${row('Target', t.takeProfit)}${row('Exit', t.exitPrice)}${row('Size', t.positionSize)}${row('Leverage', t.leverage)}${row('Fees', t.fees)}${row('Swap', t.swap)}${row('P&L', `<span class="${t.profitLoss >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(t.profitLoss)}</span>`)}${row('R', t.rMultiple)}
              </div></div>
              <div class="trade-detail-section"><h4>Strategy & Mind</h4><div class="trade-detail-grid">
                ${row('Strategy', t.strategy)}${row('Setup', t.setupType)}${row('Condition', t.marketCondition)}${row('Entry reason', t.entryReason)}${row('Exit reason', t.exitReason)}${row('Before', t.emotionBefore)}${row('During', t.emotionDuring)}${row('After', t.emotionAfter)}${row('Confidence', t.confidence)}${row('Discipline', t.discipline)}${row('Mistakes', t.mistakes || 'None')}${row('Rules broken', t.ruleBroken ? '⚠️ YES' : '✅ No')}
              </div></div>
              ${t.notes ? `<div class="trade-detail-section"><h4>Journal</h4><p style="white-space:pre-wrap;font-size:.85rem;color:var(--text-secondary);">${t.notes}</p></div>` : ''}
              ${t.screenshots && t.screenshots.length ? `<div class="trade-detail-section"><h4>Screenshots</h4><div style="display:flex;gap:.6rem;flex-wrap:wrap;">${t.screenshots.map(u => `<img src="${u}" style="width:110px;height:80px;object-fit:cover;border-radius:10px;cursor:pointer;" onclick="window.open('${u}')">`).join('')}</div></div>` : ''}
            </div></div>
            <div class="modal-footer"><button class="btn btn-danger" onclick="trades.deleteTrade(${t.id})">Delete</button><button class="btn btn-secondary" onclick="trades.editFromDetail(${t.id})">Edit</button><button class="btn btn-primary" onclick="app.closeModal()">Close</button></div></div>`;
            ov.classList.add('active');
        },
        editFromDetail(id) { app.closeModal(); setTimeout(() => this.showTradeModal(id), 60); },
        async deleteTrade(id) { if (!confirm('Delete this trade?')) return; await db.deleteTrade(id); app.closeModal(); showToast('Trade deleted'); if (typeof app !== 'undefined') app.init(); },

        async exportCSV() {
            const list = await this.all();
            const cols = ['entryDate', 'symbol', 'direction', 'entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'positionSize', 'profitLoss', 'rMultiple', 'strategy', 'session', 'timeframe', 'emotionBefore', 'discipline', 'tags'];
            const csv = [cols.join(',')].concat(list.map(t => cols.map(c => `"${(t[c] ?? '').toString().replace(/"/g, '""')}"`).join(','))).join('\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = 'tradevault-trades.csv'; a.click();
        },
        importCSV() {
            const i = document.createElement('input'); i.type = 'file'; i.accept = '.csv';
            i.onchange = async () => {
                const text = await i.files[0].text();
                const lines = text.trim().split('\n');
                const head = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
                let n = 0;
                for (let r = 1; r < lines.length; r++) {
                    const vals = lines[r].match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, -1).map(x => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
                    const o = {}; head.forEach((h, k) => o[h] = vals[k]);
                    if (!o.symbol || !o.entryDate) continue;
                    await db.addTrade({ symbol: o.symbol, direction: o.direction || 'long', entryDate: o.entryDate, entryPrice: parseFloat(o.entryPrice) || 0, exitPrice: parseFloat(o.exitPrice) || 0, positionSize: parseFloat(o.positionSize) || 1, profitLoss: parseFloat(o.profitLoss) || 0, strategy: o.strategy || '', session: o.session || '', notes: 'CSV import' });
                    n++;
                }
                showToast(`Imported ${n} trades ✅`);
                if (typeof app !== 'undefined') app.init();
            };
            i.click();
        },

        bindButtons() {
            const e = document.getElementById('exportTradesBtn'); if (e && !e.__b) { e.__b = 1; e.onclick = () => this.exportCSV(); }
            const m = document.getElementById('importTradesBtn'); if (m && !m.__b) { m.__b = 1; m.onclick = () => this.importCSV(); }
            const a = document.getElementById('addTradeBtn2'); if (a && !a.__b) { a.__b = 1; a.onclick = () => this.showTradeModal(); }
        }
    };
    window.trades = trades;
    if (document.readyState === 'complete') trades.bindButtons();
    else window.addEventListener('load', () => trades.bindButtons());
})();
