// ============ TradeVault Accounts (Live / Funded / Demo) ============
(function () {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'css/accounts.css';
    document.head.appendChild(link);

    const EMO = { live: '🟢', funded: '🟣', demo: '🔵' };
    const LBL = { live: 'Live Account', funded: 'Funded Account', demo: 'Demo Account' };

    async function uid() {
        if (!window.tvClient) return null;
        const { data } = await tvClient.auth.getSession();
        return data.session ? data.session.user.id : null;
    }
    async function getAccounts() {
        const u = await uid(); if (!u) return [];
        const { data } = await tvClient.from('trading_accounts').select('*').eq('user_id', u).order('created_at');
        return data || [];
    }
    const activeId = () => localStorage.getItem('tv_active_account_id');
    const setActive = (id) => localStorage.setItem('tv_active_account_id', id);
    const refreshApp = () => { if (typeof app !== 'undefined') app.init(); };

    // ---------- Switcher UI ----------
    async function renderSwitcher() {
        const accs = await getAccounts();
        window.tvAccountsList = accs;
        let act = accs.find(a => a.id === activeId()) || accs[0] || null;
        if (act && act.id !== activeId()) setActive(act.id);

        const sidebar = document.querySelector('.sidebar-header');
        if (!sidebar) return;
        let box = document.getElementById('accSwitcher');
        if (!box) {
            box = document.createElement('div');
            box.id = 'accSwitcher';
            box.className = 'acc-switcher';
            sidebar.after(box);
        }
        box.innerHTML = act ? `
            <button class="acc-current" id="accCurrentBtn">
                <span>${EMO[act.type] || '📊'} ${act.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="acc-menu" id="accMenu" style="display:none">
                ${accs.map(a => `<button class="acc-item ${a.id === act.id ? 'active' : ''}" data-id="${a.id}">${EMO[a.type]} ${a.name}</button>`).join('')}
                <button class="acc-item acc-add" id="accAddBtn">+ Add Account</button>
            </div>` : `<button class="acc-current" id="accAddBtn">+ Create Trading Account</button>`;

        const cur = document.getElementById('accCurrentBtn');
        const menu = document.getElementById('accMenu');
        if (cur && menu) cur.onclick = (e) => { e.stopPropagation(); menu.style.display = menu.style.display === 'none' ? 'flex' : 'none'; };
        document.addEventListener('click', () => { const m = document.getElementById('accMenu'); if (m) m.style.display = 'none'; });
        box.querySelectorAll('.acc-item[data-id]').forEach(b => {
            b.onclick = async (e) => {
                e.stopPropagation();
                setActive(b.dataset.id);
                await renderSwitcher();
                refreshApp();
            };
        });
        const add = document.getElementById('accAddBtn');
        if (add) add.onclick = (e) => { e.stopPropagation(); openModal(); };
    }

    // ---------- Create-account modal ----------
    function openModal() {
        if (document.getElementById('accModalOverlay')) return;
        const ov = document.createElement('div');
        ov.id = 'accModalOverlay';
        ov.className = 'acc-overlay';
        ov.innerHTML = `
        <div class="acc-modal">
            <h2>Choose Your Trading Account</h2>
            <p class="acc-sub">Each account keeps its own separate journal, stats and rules.</p>
            <div class="acc-types">
                <button class="acc-type" data-type="live"><span class="acc-emo">🟢</span><strong>Live Account</strong><small>Trade with your own capital.</small></button>
                <button class="acc-type" data-type="funded"><span class="acc-emo">🟣</span><strong>Funded Account</strong><small>Track a prop-firm challenge or funded account.</small></button>
                <button class="acc-type" data-type="demo"><span class="acc-emo">🔵</span><strong>Demo Account</strong><small>Practice and analyze simulated trading.</small></button>
            </div>
            <form id="accForm" style="display:none">
                <div class="acc-grid">
                    <div class="form-group"><label>Account Name *</label><input class="form-control" id="accName" placeholder="e.g. FTMO 100K / My Live / EURUSD Demo" required></div>
                    <div class="form-group"><label>Currency</label><input class="form-control" id="accCurrency" placeholder="USD"></div>
                    <div class="form-group"><label>Starting Balance ($) *</label><input class="form-control" id="accBalance" type="number" step="0.01" required></div>
                    <div class="form-group funded-only" style="display:none"><label>Prop Firm Name</label><input class="form-control" id="accFirm" placeholder="FTMO, MFF, TopStep…"></div>
                    <div class="form-group funded-only" style="display:none"><label>Phase</label><select class="form-control" id="accPhase"><option>Challenge</option><option>Evaluation</option><option>Funded</option></select></div>
                    <div class="form-group funded-only" style="display:none"><label>Account Size ($)</label><input class="form-control" id="accSize" type="number" step="0.01"></div>
                    <div class="form-group funded-only" style="display:none"><label>Profit Target ($)</label><input class="form-control" id="accTarget" type="number" step="0.01"></div>
                    <div class="form-group funded-only" style="display:none"><label>Max Daily Loss ($)</label><input class="form-control" id="accDaily" type="number" step="0.01"></div>
                    <div class="form-group funded-only" style="display:none"><label>Max Overall Drawdown ($)</label><input class="form-control" id="accMaxDD" type="number" step="0.01"></div>
                    <div class="form-group funded-only" style="display:none"><label>Min Trading Days</label><input class="form-control" id="accMinDays" type="number"></div>
                    <div class="form-group funded-only" style="display:none"><label>Start Date</label><input class="form-control" id="accStart" type="date"></div>
                </div>
                <div class="acc-actions">
                    <button type="button" class="btn btn-secondary" id="accCancel">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="accSave">Create Account</button>
                </div>
            </form>
        </div>`;
        document.body.appendChild(ov);

        let chosenType = null;
        ov.querySelectorAll('.acc-type').forEach(btn => {
            btn.onclick = () => {
                ov.querySelectorAll('.acc-type').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                chosenType = btn.dataset.type;
                const form = document.getElementById('accForm');
                form.style.display = 'block';
                form.querySelectorAll('.funded-only').forEach(f => f.style.display = chosenType === 'funded' ? '' : 'none');
            };
        });
        document.getElementById('accCancel').onclick = () => ov.remove();

        document.getElementById('accForm').onsubmit = async (e) => {
            e.preventDefault();
            if (!chosenType) return;
            const u = await uid();
            const btn = document.getElementById('accSave');
            btn.disabled = true; btn.textContent = 'Creating…';
            const num = (id) => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
            const row = {
                user_id: u,
                type: chosenType,
                name: document.getElementById('accName').value.trim(),
                currency: (document.getElementById('accCurrency').value.trim() || 'USD').toUpperCase(),
                starting_balance: num('accBalance') || 0,
                current_balance: num('accBalance') || 0
            };
            if (chosenType === 'funded') {
                row.firm_name = document.getElementById('accFirm').value.trim() || null;
                row.phase = document.getElementById('accPhase').value;
                row.account_size = num('accSize');
                row.profit_target = num('accTarget');
                row.max_daily_loss = num('accDaily');
                row.max_overall_drawdown = num('accMaxDD');
                row.min_trading_days = num('accMinDays');
                row.start_date = document.getElementById('accStart').value || null;
            }
            const { error } = await tvClient.from('trading_accounts').insert(row);
            btn.disabled = false; btn.textContent = 'Create Account';
            if (error) { showToast('Error: ' + error.message, 'error'); return; }
            const accs = await getAccounts();
            setActive(accs[accs.length - 1].id);
            ov.remove();
            await renderSwitcher();
            showToast(`${LBL[chosenType]} created! 🎉`);
            refreshApp();
        };
    }

    // ---------- Boot & auto-open ----------
    async function ensureAccounts() {
        if (!window.tvClient) return;
        const { data } = await tvClient.auth.getSession();
        if (!data.session) return;
        const mc = document.getElementById('mainContent');
        const appVisible = mc && mc.style.display === 'block';
        if (!appVisible) return;
        const accs = await getAccounts();
        if (accs.length === 0) {
            if (!document.getElementById('accModalOverlay')) openModal();
        } else {
            await renderSwitcher();
        }
    }

    window.tvAccountsEnsure = ensureAccounts;
    window.tvOpenAccountModal = openModal;

    window.addEventListener('tv-client-ready', () => setTimeout(ensureAccounts, 400));
    const mc = document.getElementById('mainContent');
    if (mc) {
        const mo = new MutationObserver(() => { if (mc.style.display === 'block') ensureAccounts(); });
        mo.observe(mc, { attributes: true, attributeFilter: ['style'] });
    }
    if (document.readyState !== 'loading') setTimeout(ensureAccounts, 400);
})();
