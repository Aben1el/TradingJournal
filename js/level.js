// ============ TradeVault Level Up ============
(function () {
    const wait = () => new Promise(r => {
        if (window.tvClient) return r();
        window.addEventListener('tv-client-ready', () => r(), { once: true });
        setTimeout(() => r(), 2500);
    });
    const sum = a => a.reduce((s, t) => s + (t.profitLoss || 0), 0);

    // ================= 1. ANALYTICS EQUITY CURVE =================
    async function analyticsEquity() {
        const grid = document.querySelector('.analytics-full-grid');
        if (!grid || document.getElementById('eqCard') || typeof db === 'undefined' || typeof Chart === 'undefined') return;
        const trades = await db.getAllTrades();
        if (!trades.length) return;
        const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
        let run = 0;
        const data = sorted.map(t => run += t.profitLoss || 0);
        const labels = sorted.map(t => formatDate(t.entryDate));
        grid.insertAdjacentHTML('beforeend', '<div class="chart-container large" id="eqCard"><h3>Equity Curve (All Time)</h3><canvas id="eqCanvas"></canvas></div>');
        const ctx = document.getElementById('eqCanvas').getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 320);
        g.addColorStop(0, 'rgba(124,127,242,.25)'); g.addColorStop(1, 'rgba(124,127,242,0)');
        new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ data, borderColor: '#7c7ff2', backgroundColor: g, fill: true, tension: .35, pointRadius: 0, borderWidth: 2.5 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + formatCurrency(c.parsed.y) } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#8a8a93', maxTicksLimit: 6, font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#8a8a93', callback: v => '$' + v, font: { size: 10 } } }
                }
            }
        });
    }

    // ================= 2. SHARE PROFILE CARD =================
    function profileShare() {
        const card = document.querySelector('.profile-card');
        if (!card || document.getElementById('shareProfileBtn')) return;
        const b = document.createElement('button');
        b.id = 'shareProfileBtn';
        b.className = 'btn btn-secondary btn-small';
        b.style.marginTop = '1rem';
        b.textContent = '📤 Share Profile Card';
        card.appendChild(b);

        b.onclick = async () => {
            await wait();
            const trades = await db.getAllTrades();
            const wins = trades.filter(t => t.profitLoss > 0).length;
            const wr = trades.length ? Math.round((wins / trades.length) * 100) : 0;
            const pl = sum(trades);
            const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
            let m = 0, c = 0;
            sorted.forEach(t => { c = t.profitLoss > 0 ? c + 1 : 0; m = Math.max(m, c); });
            const user = (window.tvProfile && window.tvProfile.username) || 'Trader';
            const ach = JSON.parse(localStorage.getItem('tv_ach') || '[]').length;

            const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1080;
            const x = cv.getContext('2d');
            x.fillStyle = '#0a0a0a'; x.fillRect(0, 0, 1080, 1080);
            let g = x.createRadialGradient(180, 160, 0, 180, 160, 800);
            g.addColorStop(0, 'rgba(99,102,241,.28)'); g.addColorStop(1, 'rgba(99,102,241,0)');
            x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
            x.strokeStyle = 'rgba(146,156,176,.55)'; x.lineWidth = 3;
            if (x.roundRect) { x.beginPath(); x.roundRect(28, 28, 1024, 1024, 40); x.stroke(); }

            try {
                const logo = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'Images/logo.png'; });
                x.save(); x.beginPath(); x.arc(116, 128, 54, 0, Math.PI * 2); x.clip(); x.drawImage(logo, 62, 74, 108, 108); x.restore();
            } catch (e) {}
            x.fillStyle = '#fff'; x.font = '700 46px Inter, Arial'; x.fillText('TradeVault', 196, 146);

            x.fillStyle = '#a78bfa'; x.font = '800 92px Inter, Arial'; x.fillText('@' + user, 80, 330);
            x.fillStyle = '#8a8a93'; x.font = '500 34px Inter, Arial';
            x.fillText('Trader statistics · ' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), 80, 390);

            const tiles = [
                ['TRADES', String(trades.length), '#ffffff'],
                ['WIN RATE', wr + '%', '#2ebd85'],
                ['TOTAL P&L', formatCurrency(pl), pl >= 0 ? '#2ebd85' : '#e5536b'],
                ['BEST STREAK', m + ' wins', '#f59e0b']
            ];
            tiles.forEach((t, i) => {
                const tx = 80 + (i % 2) * 470, ty = 460 + Math.floor(i / 2) * 220;
                x.fillStyle = 'rgba(255,255,255,.05)';
                if (x.roundRect) { x.beginPath(); x.roundRect(tx, ty, 450, 190, 24); x.fill(); }
                x.strokeStyle = 'rgba(255,255,255,.1)'; if (x.roundRect) { x.beginPath(); x.roundRect(tx, ty, 450, 190, 24); x.stroke(); }
                x.fillStyle = '#8a8a93'; x.font = '600 28px Inter, Arial'; x.fillText(t[0], tx + 36, ty + 62);
                x.fillStyle = t[2]; x.font = '800 64px Inter, Arial'; x.fillText(t[1], tx + 36, ty + 140);
            });

            x.fillStyle = '#f59e0b'; x.font = '600 36px Inter, Arial';
            x.fillText('🏆 ' + ach + ' achievements unlocked', 80, 940);
            x.fillStyle = '#5b5b66'; x.font = '500 32px Inter, Arial';
            x.fillText('Master Your Trading Edge', 80, 1000);

            cv.toBlob(bl => {
                const url = URL.createObjectURL(bl);
                const a = document.createElement('a');
                a.href = url; a.download = 'TradeVault-' + user + '.png';
                a.click(); URL.revokeObjectURL(url);
                if (typeof showToast !== 'undefined') showToast('Profile card downloaded! 📤');
            });
        };
    }

    // ================= BOOT =================
    function boot() {
        analyticsEquity();
        profileShare();
        if (typeof dashboard !== 'undefined' && !dashboard.__lvlHooked) {
            dashboard.__lvlHooked = true;
            if (dashboard.loadAnalytics) {
                const oa = dashboard.loadAnalytics.bind(dashboard);
                dashboard.loadAnalytics = async function () { const r = await oa(); analyticsEquity(); return r; };
            }
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
})();
