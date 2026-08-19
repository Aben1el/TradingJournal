// Main Application Controller

class App {
    constructor() {
        this.currentSection = 'dashboard';
    }

    async init() {
        try {
            await db.init();
            console.log('Database initialized');
            
            this.setupNavigation();
            this.setupDashboardFilters();
            this.setupTradeFilters();
            this.setupCalculators();
            this.setupSettings();
            
            // Load initial data
            await dashboard.loadDashboard();
            await trades.loadTrades();
            await strategies.loadStrategies();
            await psychology.loadPsychology();
            await goals.loadGoals();
            initCalculators();
            
        } catch (error) {
            console.error('App initialization error:', error);
            showToast('Error initializing app', 'error');
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.navigateTo(section);
            });
        });

        // Mobile menu toggle
        const toggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
        }
    }

    navigateTo(section) {
        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-section="${section}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Show section
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const activeSection = document.getElementById(section);
        if (activeSection) activeSection.classList.add('active');

        // Close mobile menu
        document.getElementById('sidebar').classList.remove('open');

        // Refresh data for specific sections
        if (section === 'dashboard') dashboard.loadDashboard();
        if (section === 'journal' || section === 'trades') trades.loadTrades();
        if (section === 'strategies') strategies.loadStrategies();
        if (section === 'psychology') psychology.loadPsychology();
        if (section === 'goals') goals.loadGoals();
    }

    setupDashboardFilters() {
        const filterBtns = document.querySelectorAll('.date-filter .filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                dashboard.setFilter(e.target.dataset.filter);
            });
        });
    }

    setupTradeFilters() {
        const search = document.getElementById('tradeSearch');
        if (search) search.addEventListener('input', debounce(e => { trades.filters.search = e.target.value; trades.loadTrades(); }, 300));

        const filterAsset = document.getElementById('filterAsset');
        if (filterAsset) filterAsset.addEventListener('change', e => { trades.filters.asset = e.target.value; trades.loadTrades(); });

        const filterStrategy = document.getElementById('filterStrategy');
        if (filterStrategy) filterStrategy.addEventListener('change', e => { trades.filters.strategy = e.target.value; trades.loadTrades(); });

        const filterResult = document.getElementById('filterResult');
        if (filterResult) filterResult.addEventListener('change', e => { trades.filters.result = e.target.value; trades.loadTrades(); });

        const filterDirection = document.getElementById('filterDirection');
        if (filterDirection) filterDirection.addEventListener('change', e => { trades.filters.direction = e.target.value; trades.loadTrades(); });

        const clearBtn = document.getElementById('clearFiltersBtn');
        if (clearBtn) clearBtn.addEventListener('click', () => {
            trades.filters = { search: '', asset: '', strategy: '', result: '', direction: '' };
            if(search) search.value = '';
            if(filterAsset) filterAsset.value = '';
            if(filterStrategy) filterStrategy.value = '';
            if(filterResult) filterResult.value = '';
            if(filterDirection) filterDirection.value = '';
            trades.loadTrades();
        });

        const addTradeBtn = document.getElementById('addTradeBtn');
        if (addTradeBtn) addTradeBtn.addEventListener('click', () => trades.showTradeModal());
    }

    setupCalculators() {
        initCalculators();
    }

    setupSettings() {
        const exportBtn = document.getElementById('exportDataBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const data = await db.exportAllData();
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `edge-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                showToast('Data exported successfully!');
            });
        }

        const importBtn = document.getElementById('importDataBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const text = await file.text();
                    try {
                        const data = JSON.parse(text);
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
            });
        }

        const clearBtn = document.getElementById('clearDataBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                if (await confirmDialog('Are you sure? This will delete ALL data permanently!')) {
                    await db.clear('trades');
                    await db.clear('strategies');
                    await db.clear('goals');
                    showToast('All data cleared');
                    this.init();
                }
            });
        }
    }

    closeModal() {
        const overlay = document.getElementById('modalOverlay');
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.innerHTML = '';
        }, 300);
    }
}

// Initialize App
const app = new App();
