// ============ TradeVault Pro Review Round ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .tv-find { position: fixed; inset: 0; z-index: 700; background: rgba(5,5,8,.7); backdrop-filter: blur(6px); display: flex; justify-content: center; padding-top: 12vh; animation: tvFade .2s ease; }
        .tv-find-box { width: min(520px, 92vw); height: fit-content; background: rgba(22,22,28,.96); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; overflow: hidden; box-shadow: 0 40px 120px rgba(0,0,0,.6); }
        html[data-theme="light"] .tv-find-box { background: rgba(240,242,247,.97); border-color: rgba(146,156,176,.5); }
        .tv-find input { width: 100%; padding: 1rem 1.2rem; background: transparent; border: none; outline: none; color: #fff; font-size: .95rem; font-family: inherit; border-bottom: 1px solid rgba(255,255,255,.08); }
        html[data-theme="light"] .tv-find input { color: #171a21; }
        .tv-find-list { max-height: 44vh; overflow-y: auto; padding: .4rem; }
        .tv-find-item { display: flex; justify-content: space-between; gap: .75rem; padding: .65rem .9rem; border-radius: 10px; color: #a0a0a8; font-size: .85rem; cursor: pointer; }
        html[data-theme="light"] .tv-find-item { color: #4a5060; }
        .tv-find-item:hover { background: rgba(99,102,241,.15); color: #fff; }
        .tv-nav-btn { width: 30px; height: 30px; border-radius: 8px; background: var(--bg-glass); border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; margin-right: .4rem; transition: all .2s ease; }
        .tv-nav-btn:hover { color: var(--text-primary); border-color: var(--border-hover); }
        .tv-nav-btn:disabled { opacity: .3; cursor: default; }
    `;
    document.head.appendChild(st);

    const wait = () => new Promise(r => {
        if (window.tvClient) return r();
        window.addEventListener('tv-client-ready', () => r(), { once: true });
        setTimeout(() => r(), 2500);
    });
    const sum = a => a.reduce((s, t) => s + (t.profitLoss || 0), 0);
    const showDetail = (id) => { if (typeof app !== 'undefined') app.closeModal(); if (typeof trades !== 'undefined') trades.showTradeDetail(id); };

    /* ---------- 1. review auto-summarize ---------- */
    function reviewSummarize() {
        const card = document.getElementById('reviewFormCard');
        if (!card || card.__sum || typeof db === 'undefined') return;
        card.__sum = true;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn btn-secondary';
        b.style.marginBottom = '1rem';
        b.textContent = '✨ Auto-summarize this period';
        card.prepend(b);
        b.onclick = async () => {
            const tab = document.querySelector('.review-tabs .filter-btn.active');
            const period = tab ? tab.dataset.review : 'weekly';
            const now = new Date(); const start = new Date();
            if (period === 'daily') start.setHours(0, 0, 0, 0);
            if (period === 'weekly') { start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); start.setHours(0, 0, 0, 0); }
            if (period === 'monthly') { start.setDate(1); start.setHours(0, 0, 0, 0); }
            const list = (await db.getAllTrades()).filter(t => new Date(t.entryDate) >= start);
            if (!list.length) return showToast('No trades in this ' + period + ' period yet', 'warning');
            const wins = list.filter(t => t.profitLoss > 0);
            const best = list.reduce((a, t) => t.profitLoss > (a ? a.profitLoss : -Infinity) ? t : a);
            const worst = list.reduce((a, t) => t.profitLoss < (a ? a.profitLoss : Infinity) ? t : a);
            const disc = list.filter(t => t.discipline);
            const emo = {}; list.forEach(t => { if (t.emotionBefore) emo[t.emotionBefore] = (emo[t.emotionBefore] || 0) + 1; });
            const topEmo = Object.entries(emo).sort((a, b) => b[1] - a[1])[0];
            const text = `${list.length} trades · ${Math.round(wins.length / list.length * 100)}% win · ${formatCurrency(sum(list))} net. ` +
                `Best: ${best.symbol} ${formatCurrency(best.profitLoss)}. Worst: ${worst.symbol} ${formatCurrency(worst.profitLoss)}. ` +
                (disc.length ? `Average discipline ${Math.round(disc.reduce((s, t) => s + t.discipline, 0) / disc.length)}/10. ` : '') +
                (topEmo ? `Dominant emotion: ${topEmo[0]}.` : '');
            const ta = card.querySelector('textarea');
            if (ta) { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); showToast('Summary written ✨'); }
            else if (navigator.clipboard) { navigator.clipboard.writeText(text); showToast('Summary copied ✨'); }
        };
    }

    /* ---------- 2. find trade (F) ---------- */
    let findBox = null;
    function openFind() {
        if (findBox) return;
        findBox = document.createElement('div');
        findBox.className = 'tv-find';
        findBox.innerHTML = `<div class="tv-find-box"><input placeholder="Search symbol, strategy, tag, date…  (Esc to close)" autocomplete="off"><div class="tv-find-list"></div></div>`;
        document.body.appendChild(findBox);
        const input = findBox.querySelector('input'); const list = findBox.querySelector('.tv-find-list');
        input.focus();
        input.oninput = async () => {
            const q = input.value.toLowerCase();
            const all = (await db.getAllTrades()).sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
            const hits = all.filter(t => !q || (t.symbol || '').toLowerCase().includes(q) || (t.strategy || '').toLowerCase().includes(q) || (t.tags || '').toLowerCase().includes(q) || String(t.entryDate).includes(q)).slice(0, 8);
            list.innerHTML = hits.map(t => `<div class="tv-find-item" data-id="${t.id}"><span><strong>${t.symbol}</strong> · ${t.direction} · ${formatDate(t.entryDate)}</span><span class="${t.profitLoss >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(t.profitLoss)}</span></div>`).join('') || '<div class="tv-find-item">No matches</div>';
            list.querySelectorAll('[data-id]').forEach(el => el.onclick = () => { const id = +el.dataset.id; closeFind(); showDetail(id); });
        };
        input.oninput();
        findBox.onclick = e => { if (e.target === findBox) closeFind(); };
    }
    function closeFind() { if (findBox) { findBox.remove(); findBox = null; } }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeFind();
        if (e.key.toLowerCase() !== 'f' || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) return;
        const main = document.getElementById('mainContent');
        if (!(main && main.style.display === 'block')) return;
        if (document.querySelector('.acc-overlay, .tv-pal, #tvReport, .tv-find')) return;
        const ov = document.getElementById('modalOverlay');
        if (ov && (ov.classList.contains('active') || ov.children.length)) return;
        e.preventDefault(); openFind();
    });

    /* ---------- 3. prev / next in trade detail ---------- */
    const ovEl = document.getElementById('modalOverlay');
    if (ovEl) new MutationObserver(async () => {
        const modal = ovEl.querySelector('.modal');
        if (!modal || !modal.querySelector('.trade-detail') || modal.__nav) return;
        const editBtn = modal.querySelector('.modal-footer .btn-primary');
        const m = (editBtn ? editBtn.getAttribute('onclick') : '').match(/editFromDetail\((\d+)\)/);
        if (!m) return;
        modal.__nav = true;
        const id = +m[1];
        const all = (await db.getAllTrades()).sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
        const idx = all.findIndex(t => t.id === id);
        const header = modal.querySelector('.modal-header');
        const closeBtn = header.querySelector('.modal-close');
        const mk = (label, target) => {
            const b = document.createElement('button');
            b.className = 'tv-nav-btn'; b.textContent = label;
            if (target == null) b.disabled = true;
            else b.onclick = () => showDetail(target);
            return b;
        };
        header.insertBefore(mk('›', idx > 0 ? all[idx - 1].id : null), closeBtn);
        header.insertBefore(mk('‹', idx < all.length - 1 ? all[idx + 1].id : null), closeBtn);
    }).observe(ovEl, { childList: true, subtree: true });

    /* ---------- 4. edit accounts ---------- */
    new MutationObserver(() => {
        document.querySelectorAll('.acc-row').forEach(row => {
            if (row.querySelector('.acc-edit')) return;
            const del = row.querySelector('.acc-del');
            const id = (del && del.dataset.del) || (row.querySelector('.acc-item') && row.querySelector('.acc-item').dataset.id);
            if (!id) return;
            const b = document.createElement('button');
            b.className = 'acc-edit'; b.title = 'Edit account'; b.textContent = '✏️';
            b.style.cssText = 'background:transparent;border:none;color:var(--text-tertiary);cursor:pointer;font-size:.8rem;padding:.5rem;border-radius:8px;transition:all .15s ease;';
            b.onclick = (e) => { e.stopPropagation(); openAccEdit(id); };
            row.insertBefore(b, del);
        });
    }).observe(document.body, { childList: true, subtree: true });

    async function openAccEdit(id) {
        await wait();
        const { data: a } = await tvClient.from('trading_accounts').select('*').eq('id', id).single();
        if (!a) return;
        const ov = document.createElement('div');
        ov.className = 'acc-overlay';
        const f = (label, key, type) => `<div class="form-group"><label>${label}</label><input class="form-control" type="${type || 'number'}" id="ae_${key}" value="${a[key] ?? ''}"></div>`;
        ov.innerHTML = `<div class="acc-modal"><h2>Edit Account</h2><form id="aeForm"><div class="acc-grid">
            ${f('Account Name', 'name', 'text')}
            ${f('Currency', 'currency', 'text')}
            ${f('Starting Balance ($)', 'starting_balance')}
            ${a.type === 'funded' ? f('Prop Firm', 'firm_name', 'text') + f('Phase', 'phase', 'text') + f('Account Size ($)', 'account_size') + f('Profit Target ($)', 'profit_target') + f('Max Daily Loss ($)', 'max_daily_loss') + f('Max Drawdown ($)', 'max_overall_drawdown') + f('Min Trading Days', 'min_trading_days') : ''}
        </div><div class="acc-actions"><button type="button" class="btn btn-secondary" id="aeCancel">Cancel</button><button class="btn btn-primary" type="submit">Save Changes</button></div></form></div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        ov.querySelector('#aeCancel').onclick = () => ov.remove();
        ov.querySelector('#aeForm').onsubmit = async (e) => {
            e.preventDefault();
            const num = k => { const v = parseFloat(ov.querySelector('#ae_' + k).value); return isNaN(v) ? null : v; };
            const row = {
                name: ov.querySelector('#ae_name').value.trim() || a.name,
                currency: (ov.querySelector('#ae_currency').value.trim() || 'USD').toUpperCase(),
                starting_balance: num('starting_balance') !== null ? num('starting_balance') : a.starting_balance
            };
            if (a.type === 'funded') Object.assign(row, {
                firm_name: ov.querySelector('#ae_firm_name').value.trim() || null,
                phase: ov.querySelector('#ae_phase').value.trim() || a.phase,
                account_size: num('account_size'), profit_target: num('profit_target'),
                max_daily_loss: num('max_daily_loss'), max_overall_drawdown: num('max_overall_drawdown'),
                min_trading_days: num('min_trading_days')
            });
            const { error } = await tvClient.from('trading_accounts').update(row).eq('id', id);
            if (error) return showToast('Error: ' + error.message, 'error');
            ov.remove();
            showToast('Account updated ✅');
            if (window.tvAccountsEnsure) tvAccountsEnsure();
            if (typeof app !== 'undefined') app.init();
        };
    }

    /* ---------- boot ---------- */
    function boot() {
        reviewSummarize();
        const ha = document.querySelector('#trades .header-actions');
        if (ha && !document.getElementById('findBtn')) {
            const b = document.createElement('button');
            b.id = 'findBtn'; b.className = 'btn btn-secondary';
            b.textContent = '🔎 Find'; b.onclick = openFind;
            ha.appendChild(b);
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
})();
