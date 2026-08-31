// ============ TradeVault P&L Calendar (heatmap) ============
(function () {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'css/calendar.css';
    document.head.appendChild(css);

    let view = new Date(); view.setDate(1);

    function compact(v) {
        const sign = v < 0 ? '-' : '';
        const a = Math.abs(v);
        if (a >= 1000) return sign + '$' + (a / 1000).toFixed(a < 10000 ? 1 : 0) + 'K';
        return sign + '$' + a.toFixed(0);
    }

    function weekCell(pl, n, has) {
        if (!has) return '<div class="tv-cal-cell empty"></div>';
        const cls = pl > 0 ? 'win' : pl < 0 ? 'loss' : '';
        return `<div class="tv-cal-cell week ${cls}">
            <div class="tv-cal-pl">${compact(pl)}</div>
            <div class="tv-cal-n">${n} trade${n === 1 ? '' : 's'}</div>
        </div>`;
    }

    async function render() {
        const dash = document.getElementById('dashboard');
        if (!dash || typeof db === 'undefined') return;

        let box = document.getElementById('tvCalendar');
        if (!box) {
            const anchor = document.getElementById('monthlyGrid');
            if (!anchor) return;
            box = document.createElement('div');
            box.id = 'tvCalendar';
            anchor.closest('.chart-container').after(box);
        }

        const trades = await db.getAllTrades();
        const y = view.getFullYear(), m = view.getMonth();
        const monthName = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const byDay = {};
        trades.forEach(t => {
            const d = new Date(t.entryDate);
            if (d.getFullYear() === y && d.getMonth() === m) {
                const k = d.getDate();
                byDay[k] = byDay[k] || { pl: 0, n: 0 };
                byDay[k].pl += t.profitLoss || 0;
                byDay[k].n++;
            }
        });
        const monthTotal = Object.values(byDay).reduce((s, d) => s + d.pl, 0);
        const maxAbs = Math.max(1, ...Object.values(byDay).map(d => Math.abs(d.pl)));

        const firstDow = new Date(y, m, 1).getDay();
        const dim = new Date(y, m + 1, 0).getDate();
        const today = new Date();

        let html = '<div class="tv-cal-grid">';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Week'].forEach(d => html += `<div class="tv-cal-dow">${d}</div>`);

        for (let i = 0; i < firstDow; i++) html += '<div class="tv-cal-cell empty"></div>';

        let dow = firstDow, wPl = 0, wN = 0, rowHas = false;
        for (let day = 1; day <= dim; day++) {
            const info = byDay[day];
            const isFuture = new Date(y, m, day) > today;
            if (info) {
                wPl += info.pl; wN += info.n; rowHas = true;
                const cls = info.pl > 0 ? 'win' : info.pl < 0 ? 'loss' : '';
                const t = Math.abs(info.pl) / maxAbs;
                html += `<div class="tv-cal-cell ${cls}" style="${cls ? `opacity:${0.75 + 0.25 * t}` : ''}">
                    <div class="tv-cal-day">${day}</div>
                    <div class="tv-cal-pl">${compact(info.pl)}</div>
                    <div class="tv-cal-n">${info.n} trade${info.n === 1 ? '' : 's'}</div>
                </div>`;
            } else {
                html += `<div class="tv-cal-cell ${isFuture ? 'future' : ''}"><div class="tv-cal-day">${day}</div></div>`;
            }
            dow++;
            if (dow === 7) { html += weekCell(wPl, wN, rowHas); dow = 0; wPl = 0; wN = 0; rowHas = false; }
        }
        if (dow !== 0) {
            for (let i = dow; i < 7; i++) html += '<div class="tv-cal-cell empty"></div>';
            html += weekCell(wPl, wN, rowHas);
        }
        html += '</div>';

        box.innerHTML = `
        <div class="tv-cal">
            <div class="tv-cal-head">
                <div style="display:flex;align-items:center;gap:.75rem;">
                    <button class="tv-cal-btn" id="tvCalPrev" aria-label="Previous month">←</button>
                    <div class="tv-cal-title">${monthName}</div>
                    <button class="tv-cal-btn" id="tvCalNext" aria-label="Next month">→</button>
                </div>
                <div class="tv-cal-total ${monthTotal >= 0 ? 'text-success' : 'text-danger'}">${compact(monthTotal)}</div>
            </div>
            ${html}
        </div>`;

        document.getElementById('tvCalPrev').onclick = (e) => { e.stopPropagation(); view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); };
        document.getElementById('tvCalNext').onclick = (e) => { e.stopPropagation(); view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); };
    }

    function hook() {
        if (typeof dashboard !== 'undefined' && !dashboard.__calHooked) {
            dashboard.__calHooked = true;
            const orig = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await orig(); render(); return r; };
        }
    }
    function boot() { hook(); render(); }

    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot);
    window.addEventListener('tv-client-ready', () => setTimeout(boot, 600));
})();
