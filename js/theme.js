// ============ TradeVault Theme System ============
(function () {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'css/theme-light.css';
    document.head.appendChild(css);

    const root = document.documentElement;
    const get = () => root.dataset.theme || 'dark';
    const set = (t) => {
        root.dataset.theme = t;
        localStorage.setItem('tv_theme', t);
        updateIcons();
        applyCharts();
    };

    const sun = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    const moon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    function makeBtn(extra) {
        const b = document.createElement('button');
        b.className = 'tv-theme-btn ' + (extra || '');
        b.title = 'Toggle theme';
        b.onclick = (e) => { e.stopPropagation(); set(get() === 'dark' ? 'light' : 'dark'); };
        return b;
    }

    function updateIcons() {
        document.querySelectorAll('.tv-theme-btn').forEach(b => b.innerHTML = get() === 'dark' ? sun : moon);
    }

    function inject() {
        const navActions = document.querySelector('.navbar-actions');
        if (navActions && !navActions.querySelector('.tv-theme-btn')) {
            navActions.insertBefore(makeBtn(''), navActions.querySelector('.nav-btn-menu'));
        }
        const sbHead = document.querySelector('.sidebar-header');
        if (sbHead && !sbHead.querySelector('.tv-theme-btn')) {
            sbHead.appendChild(makeBtn('tv-theme-side'));
        }
        if (!navActions && !sbHead && !document.querySelector('.tv-theme-float')) {
            document.body.appendChild(makeBtn('tv-theme-float'));
        }
        updateIcons();
    }

    function applyCharts() {
        const light = get() === 'light';
        if (typeof Chart !== 'undefined') Chart.defaults.color = light ? '#5b6070' : '#8a8a93';

        // theme-aware doughnut center text
        if (typeof centerTextPlugin !== 'undefined' && !centerTextPlugin.__tvPatched) {
            centerTextPlugin.__tvPatched = true;
            centerTextPlugin.afterDraw = function (chart) {
                if (chart.config.type !== 'doughnut') return;
                const meta = chart.getDatasetMeta(0);
                if (!meta.data.length) return;
                const { ctx } = chart;
                const x = meta.data[0].x, y = meta.data[0].y;
                const data = chart.data.datasets[0].data;
                const total = data.reduce((a, b) => a + b, 0);
                const pct = total ? Math.round(((data[0] || 0) / total) * 100) : 0;
                const L = document.documentElement.dataset.theme === 'light';
                ctx.save();
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = "800 22px Inter, sans-serif"; ctx.fillStyle = L ? '#14151c' : '#ffffff';
                ctx.fillText(pct + '%', x, y - 8);
                ctx.font = "600 9px Inter, sans-serif"; ctx.fillStyle = L ? '#5b6070' : '#8a8a93';
                ctx.fillText('WIN RATE', x, y + 12);
                ctx.restore();
            };
        }

        // re-render visible charts with new colors
        if (typeof dashboard !== 'undefined') {
            const active = document.querySelector('.section.active');
            if (active && active.id === 'dashboard') dashboard.loadDashboard();
            if (active && active.id === 'analytics') dashboard.loadAnalytics();
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
    else inject();
    window.addEventListener('tv-client-ready', inject);
    applyCharts();
})();
