// ============ TradeVault Fix2: backdrop close + N shortcut ============
(function () {
    // click empty space on account modal background → close it
    new MutationObserver(() => {
        document.querySelectorAll('.acc-overlay').forEach(ov => {
            if (ov.__close) return;
            ov.__close = true;
            ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
        });
    }).observe(document.body, { childList: true, subtree: true });

    // press N → new trade (when safe)
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) return;
        const main = document.getElementById('mainContent');
        if (!(main && main.style.display === 'block')) return;
        const ov = document.getElementById('modalOverlay');
        if (ov && (ov.classList.contains('active') || ov.children.length)) return;
        if (document.querySelector('.acc-overlay, .tv-pal, #tvReport')) return;
        e.preventDefault();
        if (typeof trades !== 'undefined') trades.showTradeModal();
    });
})();
