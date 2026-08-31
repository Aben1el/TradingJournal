// ============ TradeVault Polish Pack ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        ::selection { background: rgba(99, 102, 241, 0.35); }
        .tv-progress { position: fixed; top: 0; left: 0; height: 3px; width: 0; z-index: 500;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
            box-shadow: 0 0 12px rgba(99,102,241,.6); }
        .tv-lightbox { position: fixed; inset: 0; z-index: 600; background: rgba(5,5,8,.9);
            backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center;
            padding: 2rem; cursor: zoom-out; animation: tvFade .25s ease; }
        .tv-lightbox img { max-width: 95%; max-height: 95%; border-radius: 14px;
            box-shadow: 0 40px 120px rgba(0,0,0,.6); animation: tvZoom .3s cubic-bezier(.22,1,.36,1); }
        @keyframes tvFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tvZoom { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
        .tv-confetti { position: fixed; top: -14px; z-index: 650; width: 8px; height: 14px; border-radius: 2px;
            pointer-events: none; animation: tvFall linear forwards; }
        @keyframes tvFall { to { transform: translateY(110vh) rotate(720deg); opacity: .9; } }
        @media (prefers-reduced-motion: reduce) { .tv-confetti, .tv-progress { display: none; } }
    `;
    document.head.appendChild(st);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- 1. scroll progress (landing) ----
    if (document.getElementById('landing-page')) {
        const bar = document.createElement('div');
        bar.className = 'tv-progress';
        document.body.appendChild(bar);
        addEventListener('scroll', () => {
            const h = document.documentElement;
            const max = h.scrollHeight - h.clientHeight;
            bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
        }, { passive: true });
    }

    // ---- 2. feature card 3D tilt ----
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            if (reduced) return;
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = `translateY(-6px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });

    // ---- 3. count-up numbers ----
    function animateValue(el) {
        const raw = el.textContent.trim();
        const m = raw.match(/^([^0-9-]*)(-?\d[\d,]*(?:\.\d+)?)(.*)$/);
        if (!m) return;
        const num = parseFloat(m[2].replace(/,/g, ''));
        if (isNaN(num)) return;
        const decimals = (m[2].split('.')[1] || '').length;
        const start = performance.now(), dur = 700;
        (function frame(t) {
            const p = Math.min(1, (t - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = m[1] + (num * eased).toFixed(decimals) + m[3];
            if (p < 1) requestAnimationFrame(frame); else el.textContent = raw;
        })(start);
    }
    function runCountUps() {
        if (reduced) return;
        document.querySelectorAll('.stat-value, .today-value, .pstat-value, .f-value').forEach(el => {
            if (el.dataset.tvCounted) return;
            el.dataset.tvCounted = '1';
            animateValue(el);
        });
    }

    // ---- 4. screenshot lightbox ----
    document.addEventListener('click', (e) => {
        const img = e.target.closest('.trade-screenshot-container img');
        if (!img) return;
        const lb = document.createElement('div');
        lb.className = 'tv-lightbox';
        const big = document.createElement('img');
        big.src = img.src;
        lb.appendChild(big);
        lb.onclick = () => lb.remove();
        document.body.appendChild(lb);
    });

    // ---- 5. confetti on funded target hit ----
    function confetti() {
        if (reduced || sessionStorage.getItem('tv_confetti')) return;
        sessionStorage.setItem('tv_confetti', '1');
        const colors = ['#6366f1', '#8b5cf6', '#2ebd85', '#f59e0b', '#e5536b', '#ffffff'];
        for (let i = 0; i < 26; i++) {
            const c = document.createElement('div');
            c.className = 'tv-confetti';
            c.style.left = Math.random() * 100 + 'vw';
            c.style.background = colors[i % colors.length];
            c.style.animationDuration = (1.2 + Math.random() * 1.4) + 's';
            c.style.animationDelay = (Math.random() * 0.3) + 's';
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 3200);
        }
    }

    // ---- hook into dashboard renders ----
    function hookDash() {
        if (typeof dashboard !== 'undefined' && !dashboard.__polishHooked) {
            dashboard.__polishHooked = true;
            const orig = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () {
                const r = await orig();
                runCountUps();
                if (document.querySelector('.funded-alert.success')) confetti();
                return r;
            };
        }
    }
    function boot() { hookDash(); runCountUps(); }
    if (document.readyState === 'complete') boot();
    else addEventListener('load', boot);

    // catch late-rendered profile stats
    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; runCountUps(); });
    }).observe(document.body, { childList: true, subtree: true });
})();
