// Main Application Controller — onclick bindings + collapsible sidebar

class App {
    constructor() { this.currentSection = 'dashboard'; }

    async init() {
        try {
            await db.init();
            this.guardModals();
            this.applyProfile();
            this.setupNavigation();
            this.setupDashboardFilters();
            this.setupTradeFilters();
            this.setupSettings();
            initCalculators();
            reviews.init();

            await dashboard.loadDashboard();
            await trades.loadTrades();
            await strategies.loadStrategies();
            await psychology.loadPsychology();
            await goals.loadGoals();
        } catch (error) {
            console.error('App initialization error:', error);
            showToast('Error initializing app', 'error');
        }
    }

    // ONE modal at a time — forever — for EVERY modal opener
    guardModals() {
        const busy = () => {
            const ov = document.getElementById('modalOverlay');
            return ov && (ov.classList.contains('active') || ov.children.length > 0);
        };
        const wrap = (obj, fn) => {
            if (!obj || obj['__g_' + fn]) return;
            obj['__g_' + fn] = true;
            const orig = obj[fn].bind(obj);
            obj[fn] = function (...a) { if (busy()) return; return orig(...a); };
        };
        if (typeof trades !== 'undefined') { wrap(trades, 'showTradeModal'); wrap(trades, 'showTradeDetail'); }
        if (typeof strategies !== 'undefined') wrap(strategies, 'showStrategyModal');
        if (typeof goals !== 'undefined') wrap(goals, 'showGoalModal');
    }

    applyProfile() {
        const name = localStorage.getItem('tv_name') || 'Trader';
        const nameEl = document.getElementById('sidebarUserName');
        const avatarEl = document.getElementById('userAvatarLetter');
        if (nameEl) nameEl.textContent = name;
        if (avatarEl) avatarEl.textContent = (name.charAt(0) || 'T').toUpperCase();
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                this.navigateTo(item.dataset.section);
            };
            const s = item.querySelector('span');
            if (s) item.title = s.textContent;
        });

        const toggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle && sidebar) {
            let backdrop = document.getElementById('sidebarBackdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'sidebarBackdrop';
                backdrop.className = 'sidebar-backdrop';
                document.body.appendChild(backdrop);
            }
            toggle.onclick = () => {
                const opening = !sidebar.classList.contains('open');
                sidebar.classList.toggle('open');
                document.body.classList.remove('sb-push', 'sb-overlay');
                if (opening) document.body.classList.add(window.innerWidth >= 768 ? 'sb-push' : 'sb-overlay');
            };
            backdrop.onclick = () => {
                sidebar.classList.remove('open');
                document.body.classList.remove('sb-push', 'sb-overlay');
            };
            window.addEventListener('resize', () => {
                if (window.innerWidth > 1024) {
                    sidebar.classList.remove('open');
                    document.body.classList.remove('sb-push', 'sb-overlay');
                }
            });
        }

        this.setupSidebarCollapse();
    }

    // ---------- collapsible icon-rail sidebar ----------
    setupSidebarCollapse() {
        const st = document.getElementById('sbCollapseCss');
        if (!st) {
            const s = document.createElement('style');
            s.id = 'sbCollapseCss';
            s.textContent = `
                .sidebar { transition: width .3s cubic-bezier(.22,1,.36,1); }
                .main-content { transition: margin-left .3s cubic-bezier(.22,1,.36,1); }
                .sidebar-header { position: relative; }
                .sb-head-btns { position: absolute; right: .8rem; top: 50%; transform: translateY(-50%); display: flex; gap: .4rem; z-index: 5; }
                .sb-head-btns .tv-theme-side { position: static; transform: none; width: 32px; height: 32px; }
                .sb-collapse-btn { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-glass);
                    border: 1px solid var(--border-color); color: var(--text-secondary);
                    display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s ease; }
                .sb-collapse-btn:hover { color: var(--text-primary); border-color: var(--border-hover); transform: scale(1.06); }
                .sb-collapse-btn svg { transition: transform .3s ease; }

                body.sb-collapsed .sidebar { width: 78px; }
                body.sb-collapsed .main-content { margin-left: 78px; }
                body.sb-collapsed .logo-text, body.sb-collapsed .nav-item span, body.sb-collapsed .user-details,
                body.sb-collapsed .acc-current > span, body.sb-collapsed .acc-current > svg { display: none; }
                body.sb-collapsed .sidebar-header { display: flex; flex-direction: column; align-items: center; gap: .6rem; padding: 1.1rem .5rem; }
                body.sb-collapsed .logo { justify-content: center; }
                body.sb-collapsed .logo-img { width: 36px; height: 36px; }
                body.sb-collapsed .sb-head-btns { position: static; transform: none; }
                body.sb-collapsed .sb-collapse-btn svg { transform: rotate(180deg); }
                body.sb-collapsed .nav-item { justify-content: center; padding: .9rem 0; }
                body.sb-collapsed .nav-item:hover { padding-left: 0; }
                body.sb-collapsed .sidebar-nav { padding: .75rem 0; }
                body.sb-collapsed .sidebar-footer { padding: 1rem .5rem; }
                body.sb-collapsed .user-info { justify-content: center; }
                body.sb-collapsed .user-avatar { width: 36px; height: 36px; }
                body.sb-collapsed .user-avatar-img { width: 36px; height: 36px; }
                body.sb-collapsed .acc-switcher { padding: .5rem .6rem; }
                body.sb-collapsed .acc-current { justify-content: center; padding: .6rem; }
                body.sb-collapsed .acc-current::before { content: '📊'; font-size: .9rem; }
                body.sb-collapsed .acc-menu { left: 72px; right: auto; top: -6px; width: 230px; }

                @media (max-width: 1024px) {
                    .sb-collapse-btn { display: none; }
                    body.sb-collapsed .sidebar { width: var(--sidebar-width); }
                    body.sb-collapsed .main-content { margin-left: 0; }
                    body.sb-collapsed .logo-text { display: inline; }
                    body.sb-collapsed .nav-item span { display: inline; }
                    body.sb-collapsed .user-details { display: block; }
                    body.sb-collapsed .acc-current > span, body.sb-collapsed .acc-current > svg { display: inline; }
                    body.sb-collapsed .acc-current::before { content: none; }
                    body.sb-collapsed .nav-item { justify-content: flex-start; padding: .875rem 1.5rem; }
                    body.sb-collapsed .sidebar-header { flex-direction: row; padding: 1.5rem; }
                    body.sb-collapsed .acc-menu { left: 1rem; right: 1rem; width: auto; top: calc(100% - .4rem); }
                }
            `;
            document.head.appendChild(s);
        }

        const header = document.querySelector('.sidebar-header');
        if (!header || document.querySelector('.sb-collapse-btn')) return;

        const wrap = document.createElement('div');
        wrap.className = 'sb-head-btns';
        const btn = document.createElement('button');
        btn.className = 'sb-collapse-btn';
        btn.title = 'Collapse / expand';
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>';
        btn.onclick = () => {
            const c = document.body.classList.toggle('sb-collapsed');
            localStorage.setItem('tv_sb_collapsed', c ? '1' : '');
        };
        wrap.appendChild(btn);
        header.appendChild(wrap);

        // pull the theme button into the same cluster (whenever it appears)
        const pullTheme = () => {
            const t = header.querySelector('.sidebar-header > .tv-theme-side');
            if (t) wrap.insertBefore(t, btn);
        };
        pullTheme();
        setTimeout(pullTheme, 900);

        if (localStorage.getItem('tv_sb_collapsed') === '1') document.body.classList.add('sb-collapsed');
    }

    navigateTo(section) {
        this.currentSection = section;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-section="${section}"]`);
        if (activeNav) activeNav.classList.add('active');

        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const activeSection = document.getElementById(section);
        if (activeSection) activeSection.classList.add('active');

        document.getElementById('sidebar').classList.remove('open');
        document.body.classList.remove('sb-push', 'sb-overlay');

        if (section === 'dashboard') dashboard.loadDashboard();
        if (section === 'journal' || section === 'trades') trades.loadTrades();
        if (section === 'reviews') reviews.refresh();
        if (section === 'strategies') strategies.loadStrategies();
        if (section === 'analytics') dashboard.loadAnalytics();
        if (section === 'psychology') psychology.loadPsychology();
        if (section === 'goals') goals.loadGoals();
    }

    setupDashboardFilters() {
        document.querySelectorAll('.date-filter .filter-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.date-filter .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                dashboard.setFilter(e.target.dataset.filter);
            };
        });
    }

    setupTradeFilters() {
        const search = document.getElementById('tradeSearch');
        if (search) search.oninput = debounce(e => { trades.filters.search = e.target.value; trades.loadTrades(); }, 300);

        const bind = (id, key) => {
            const el = document.getElementById(id);
            if (el) el.onchange = e => { trades.filters[key] = e.target.value; trades.loadTrades(); };
        };
        bind('filterAsset', 'asset');
        bind('filterStrategy', 'strategy');
        bind('filterResult', 'result');
        bind('filterDirection', 'direction');

        const clearBtn = document.getElementById('clearFiltersBtn');
        if (clearBtn) clearBtn.onclick = () => {
            trades.filters = { search: '', asset: '', strategy: '', result: '', direction: '' };
            ['tradeSearch', 'filterAsset', 'filterStrategy', 'filterResult', 'filterDirection'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            trades.loadTrades();
        };

        const addTradeBtn = document.getElementById('addTradeBtn');
        if (addTradeBtn) addTradeBtn.onclick = () => trades.showTradeModal();
    }

    setupSettings() {
        const nameInput = document.getElementById('settingsName');
        const balanceInput = document.getElementById('settingsBalance');
        const saveBtn = document.getElementById('saveSettingsBtn');

        if (nameInput) nameInput.value = localStorage.getItem('tv_name') || '';
        if (balanceInput) balanceInput.value = localStorage.getItem('tv_starting_balance') || '';

        if (saveBtn) saveBtn.onclick = () => {
            const name = (nameInput.value || '').trim() || 'Trader';
            const balance = parseFloat(balanceInput.value);
            localStorage.setItem('tv_name', name);
            if (!isNaN(balance) && balance > 0) localStorage.setItem('tv_starting_balance', String(balance));
            this.applyProfile();
            dashboard.loadDashboard();
            showToast('Settings saved!');
        };

        const exportBtn = document.getElementById('exportDataBtn');
        if (exportBtn) exportBtn.onclick = async () => {
            const data = await db.exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tradevault-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Data exported successfully!');
        };

        const importBtn = document.getElementById('importDataBtn');
        if (importBtn) importBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const data = JSON.parse(await file.text());
                    if (await confirmDialog('This will replace all current data. Continue?')) {
                        await db.importAllData(data);
                        showToast('Data imported successfully!');
                        this.init();
                    }
                } catch (err) {
                    showToast('Invalid file format', 'error');
                }
            };
            input.click();
        };

        const clearBtn = document.getElementById('clearDataBtn');
        if (clearBtn) clearBtn.onclick = async () => {
            if (await confirmDialog('Are you sure? This will delete ALL data permanently!')) {
                await db.clear('trades');
                await db.clear('strategies');
                await db.clear('goals');
                await db.clear('journal');
                showToast('All data cleared');
                this.init();
            }
        };
    }

    closeModal() {
        const overlay = document.getElementById('modalOverlay');
        overlay.classList.remove('active');
        overlay.innerHTML = '';
    }
}

const app = new App();
