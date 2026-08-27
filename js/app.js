// Main Application Controller — all bindings use onclick (self-replacing, no duplicates)

class App {
    constructor() {
        this.currentSection = 'dashboard';
    }

    async init() {
        try {
            await db.init();
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
        });
        const toggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle && sidebar) toggle.onclick = () => sidebar.classList.toggle('open');
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

        // ONE Add Trade form, always. Guard ignores clicks while a modal is open.
        const addTradeBtn = document.getElementById('addTradeBtn');
        if (addTradeBtn) addTradeBtn.onclick = () => {
            if (document.getElementById('modalOverlay').classList.contains('active')) return;
            trades.showTradeModal();
        };
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
        setTimeout(() => { overlay.innerHTML = ''; }, 300);
    }
}

const app = new App();
