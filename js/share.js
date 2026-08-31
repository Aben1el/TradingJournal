// ============ TradeVault Share Cards ============
(function () {
    const ov = document.getElementById('modalOverlay');
    if (!ov) return;

    new MutationObserver(inject).observe(ov, { childList: true, subtree: true });

    function inject() {
        const modal = ov.querySelector('.modal');
        if (!modal || !modal.querySelector('.trade-detail')) return;
        const footer = modal.querySelector('.modal-footer');
        if (!footer || footer.querySelector('#tvShareBtn')) return;
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.id = 'tvShareBtn';
        btn.innerHTML = '📤 Share Card';
        btn.onclick = () => buildCard(modal);
        footer.insertBefore(btn, footer.firstChild);
    }

    function loadImg(src) {
        return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    }
    function rr(x, a, b, w, h, r) {
        if (x.roundRect) { x.beginPath(); x.roundRect(a, b, w, h, r); }
        else { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
    }

    async function buildCard(modal) {
        // ---- parse trade from modal ----
        const head = (modal.querySelector('.modal-header h2') || {}).textContent || 'TRADE';
        const parts = head.split('-').map(s => s.trim());
        const symbol = parts[0] || 'TRADE';
        const dir = (parts[1] || 'LONG').toUpperCase();
        const cells = {};
        let pl = '', positive = true;
        modal.querySelectorAll('.trade-detail-grid div').forEach(d => {
            const m = d.textContent.match(/^(.+?):\s*(.*)$/);
            if (!m) return;
            cells[m[1].trim()] = m[2].trim();
            if (m[1].trim() === 'P/L') {
                const span = d.querySelector('span');
                positive = span ? span.classList.contains('text-success') : !m[2].includes('-');
                pl = m[2].trim();
            }
        });
        const user = (window.tvProfile && window.tvProfile.username) ||
            (document.getElementById('sidebarUserName') || {}).textContent || 'Trader';

        // ---- draw ----
        const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
        const x = c.getContext('2d');

        x.fillStyle = '#0a0a0a'; x.fillRect(0, 0, 1080, 1080);
        let g = x.createRadialGradient(160, 140, 0, 160, 140, 760);
        g.addColorStop(0, 'rgba(99,102,241,0.28)'); g.addColorStop(1, 'rgba(99,102,241,0)');
        x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
        x.save(); x.translate(300, -100); x.rotate(0.4);
        const rg = x.createLinearGradient(0, 0, 420, 0);
        rg.addColorStop(0, 'rgba(255,255,255,0.10)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = rg; x.fillRect(-260, -200, 460, 1700); x.restore();

        x.strokeStyle = 'rgba(146,156,176,0.55)'; x.lineWidth = 3;
        rr(x, 28, 28, 1024, 1024, 40); x.stroke();

        try {
            const logo = await loadImg('Images/logo.png');
            x.save(); x.beginPath(); x.arc(116, 128, 54, 0, Math.PI * 2); x.clip();
            x.drawImage(logo, 62, 74, 108, 108); x.restore();
        } catch (e) {}
        x.fillStyle = '#ffffff'; x.font = '700 46px Inter, Arial, sans-serif';
        x.fillText('TradeVault', 196, 146);

        x.fillStyle = '#8a8a93'; x.font = '500 34px Inter, Arial, sans-serif';
        x.textAlign = 'right'; x.fillText(cells['Date'] || '', 1000, 140); x.textAlign = 'left';

        x.fillStyle = '#ffffff'; x.font = '800 116px Inter, Arial, sans-serif';
        x.fillText(symbol, 80, 400);

        const long = dir.includes('LONG');
        x.fillStyle = long ? 'rgba(46,189,133,0.15)' : 'rgba(229,83,107,0.15)';
        rr(x, 80, 440, 240, 76, 38); x.fill();
        x.strokeStyle = long ? 'rgba(46,189,133,0.5)' : 'rgba(229,83,107,0.5)'; x.lineWidth = 2; rr(x, 80, 440, 240, 76, 38); x.stroke();
        x.fillStyle = long ? '#2ebd85' : '#e5536b'; x.font = '700 40px Inter, Arial, sans-serif';
        x.textAlign = 'center'; x.fillText(dir, 200, 492); x.textAlign = 'left';

        x.fillStyle = '#a0a0a0'; x.font = '500 40px Inter, Arial, sans-serif';
        x.fillText(`Entry ${cells['Entry'] || '—'}   →   Exit ${cells['Exit'] || '—'}`, 80, 610);

        x.save();
        x.shadowColor = positive ? 'rgba(46,189,133,0.55)' : 'rgba(229,83,107,0.55)';
        x.shadowBlur = 60;
        x.fillStyle = positive ? '#2ebd85' : '#e5536b';
        x.font = '800 168px Inter, Arial, sans-serif';
        x.fillText(pl || '$0.00', 80, 810);
        x.restore();

        x.fillStyle = '#8a8a93'; x.font = '500 36px Inter, Arial, sans-serif';
        x.fillText(`${cells['R Multiple'] ? cells['R Multiple'] + '  •  ' : ''}${cells['Strategy'] && cells['Strategy'] !== 'N/A' ? cells['Strategy'] + '  •  ' : ''}Discipline of a pro`, 80, 900);

        x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(80, 960); x.lineTo(1000, 960); x.stroke();
        x.fillStyle = '#a78bfa'; x.font = '600 36px Inter, Arial, sans-serif';
        x.fillText('@' + user, 80, 1016);
        x.fillStyle = '#5b5b66'; x.textAlign = 'right';
        x.fillText('Master Your Trading Edge', 1000, 1016); x.textAlign = 'left';

        c.toBlob(b => {
            const url = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = url;
            a.download = ('TradeVault-' + symbol + '-' + pl).replace(/[^a-z0-9\-_.$]/gi, '') + '.png';
            a.click();
            URL.revokeObjectURL(url);
            if (typeof showToast !== 'undefined') showToast('Share card downloaded! 📤');
        });
    }
})();
