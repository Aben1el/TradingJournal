// ============ TradeVault Command Palette (Ctrl+K) ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .tv-pal { position: fixed; inset: 0; z-index: 700; background: rgba(5,5,8,.7);
            backdrop-filter: blur(6px); display: flex; justify-content: center; padding-top: 14vh;
            animation: tvFade .2s ease; }
        .tv-pal-box { width: min(560px, 92vw); height: fit-content; background: rgba(22,22,28,.95);
            border: 1px solid rgba(255,255,255,.12); border-radius: 18px; overflow: hidden;
            box-shadow: 0 40px 120px rgba(0,0,0,.6); animation: tvZoom .25s cubic-bezier(.22,1,.36,1); }
        html[data-theme="light"] .tv-pal-box { background: rgba(240,242,247,.97); border-color: rgba(146,156,176,.5); }
        .tv-pal input { width: 100%; padding: 1.1rem 1.25rem; background: transparent; border: none; outline: none;
            color: #fff; font-size: 1rem; font-family: inherit; border-bottom: 1px solid rgba(255,255,255,.08); }
        html[data-theme="light"] .tv-pal input { color: #171a21; border-bottom-color: rgba(146,156,176,.4); }
        .tv-pal-list { max-height: 46vh; overflow-y: auto; padding: .4rem; }
        .tv-pal-item { display: flex; align-items: center; gap: .75rem; padding: .7rem .9rem; border-radius: 10px;
            color: #a0a0a8; font-size: .9rem; cursor: pointer; }
        html[data-theme="light"] .tv-pal-item { color: #4a5060; }
        .tv-pal-item.sel, .tv-pal-item:hover { background: rgba(99,102,241,.15); color: #fff; }
        html[data-theme="light"] .tv-pal-item.sel, html[data-theme="light"] .tv-pal-item:hover { color: #171a21; }
        .tv-pal-hint { padding: .55rem 1rem; font-size: .68rem; color: #5b5b66; border-top: 1px solid rgba(255,255,255,.06); }
    `;
    document.head.appendChild(st);

    const nav = (s) => { if (typeof app !== 'undefined' && document.getElementById('mainContent').style.display === 'block') app.navigateTo(s); else location.href = 'index.html#journal'; };

    const items = [
        { icon: '📊', label: 'Dashboard', run: () => nav('dashboard') },
        { icon: '📝', label: 'Journal', run: () => nav('journal') },
        { icon: '➕', label: 'Add Trade', run: () => { nav('journal'); setTimeout(() => typeof trades !== 'undefined' && trades.showTradeModal(), 400); } },
        { icon: '📚', label: 'Reviews', run: () => nav('reviews') },
        { icon: '📈', label: 'Trades History', run: () => nav('trades') },
        { icon: '⭐', label: 'Strategies', run: () => nav('strategies') },
        { icon: '🧮', label: 'Analytics', run: () => nav('analytics') },
        { icon: '🧠', label: 'Psychology', run: () => nav('psychology') },
        { icon: '🖩', label: 'Calculators', run: () => nav('calculators') },
        { icon: '🎯', label: 'Goals', run: () => nav('goals') },
        { icon: '⚙️', label: 'Settings', run: () => nav('settings') },
        { icon: '👤', label: 'Profile', run: () => location.href = 'profile.html' },
        { icon: '🏠', label: 'Back to Home', run: () => location.href = 'index.html' },
        { icon: '🚪', label: 'Log Out', run: () => { if (window.tvClient) tvClient.auth.signOut().then(() => location.href = 'index.html'); } }
    ];

    let box = null, list = null, input = null, sel = 0, filtered = [];

    function open() {
        if (box) return;
        box = document.createElement('div'); box.className = 'tv-pal';
        box.innerHTML = `<div class="tv-pal-box">
            <input placeholder="Type a command…  (Esc to close)" autocomplete="off">
            <div class="tv-pal-list"></div>
            <div class="tv-pal-hint">↑↓ navigate · Enter select · Esc close</div>
        </div>`;
        document.body.appendChild(box);
        input = box.querySelector('input'); list = box.querySelector('.tv-pal-list');
        input.oninput = () => render();
        input.onkeydown = (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, filtered.length - 1); render(true); }
            if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(true); }
            if (e.key === 'Enter' && filtered[sel]) { close(); filtered[sel].run(); }
        };
        box.onclick = (e) => { if (e.target === box) close(); };
        input.focus();
        render();
    }
    function close() { if (box) { box.remove(); box = null; } }

    function render(keepSel) {
        const q = (input.value || '').toLowerCase();
        filtered = items.filter(i => i.label.toLowerCase().includes(q));
        if (!keepSel) sel = 0;
        list.innerHTML = filtered.map((i, idx) =>
            `<div class="tv-pal-item ${idx === sel ? 'sel' : ''}" data-idx="${idx}">${i.icon} ${i.label}</div>`).join('') ||
            `<div class="tv-pal-item">No results</div>`;
        list.querySelectorAll('.tv-pal-item[data-idx]').forEach(el => {
            el.onclick = () => { close(); filtered[+el.dataset.idx].run(); };
        });
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box ? close() : open(); }
        if (e.key === 'Escape') close();
    });
})();
