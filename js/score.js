// ============ TradeVault Trader Scorecard + Shortcuts ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .score-card { margin: 0 0 1.5rem; padding: 1.4rem 1.6rem; border-radius: 16px; border: 1px solid var(--border-color); background: var(--bg-card); backdrop-filter: blur(14px); display: flex; gap: 2rem; align-items: center; flex-wrap: wrap; animation: cardIn .5s ease backwards; }
        .score-gauge { position: relative; width: 120px; height: 120px; flex: 0 0 auto; }
        .score-gauge svg { width: 120px; height: 120px; transform: rotate(-90deg); }
        .score-gauge .num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .score-gauge .num b { font-size: 1.7rem; font-weight: 800; }
        .score-gauge .num span { font-size: .6rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .06em; }
        .score-right { flex: 1; min-width: 240px; }
        .score-right h4 { font-size: .95rem; margin-bottom: .2rem; }
        .score-right .grade { font-size: .7rem; font-weight: 700; padding: .15rem .6rem; border-radius: 100px; margin-left: .5rem; vertical-align: 2px; }
        .score-bars { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem 1.6rem; margin-top: .9rem; }
        .sbar small { display: flex; justify-content: space-between; font-size: .68rem; color: var(--text-secondary); margin-bottom: .3rem; }
        .sbar .track { height: 6px; border-radius: 100px; background: rgba(255,255,255,.07); overflow: hidden; }
        .sbar .fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg,#6366f1,#8b5cf6); transition: width .8s cubic-bezier(.22,1,.36,1); }
        @media (max-width: 640px) { .score-bars { grid-template-columns: 1fr; } }
        .tv-keys { position: fixed; inset: 0; z-index: 750; background: rgba(5,5,8,.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; animation: tvFade .2s ease; }
        .tv-keys-box { width: min(420px, 92vw); background: rgba(22,22,28,.97); border: 1px solid rgba(255,255,255,.12); border-radius: 18px; padding: 1.6rem; box-shadow: 0 40px 120px rgba(0,0,0,.6); }
        html[data-theme="light"] .tv-keys-box { background: rgba(240,242,247,.97); border-color: rgba(146,156,176,.5); }
        .tv-keys-box h3 { margin-bottom: 1rem; }
        .tv-key-row { display: flex; justify-content: space-between; padding: .5rem 0; font-size: .85rem; color: var(--text-secondary); border-bottom: 1px solid rgba(255,255,255,.06); }
        .tv-key-row kbd { background: rgba(255,255,255,.08); border: 1px solid var(--border-color); border-radius: 6px; padding: .1rem .5rem; font-size: .72rem; font-family: ui-monospace, monospace; color: var(--text-primary); }
    `;
    document.head.appendChild(st);

    // ---------- scorecard ----------
    async function scorecard() {
        const dash = document.getElementById('dashboard');
        const main = document.getElementById('mainContent');
        if (!dash || document.getElementById('scoreCard') || typeof db === 'undefined') return;
        if (!(main && main.style.display === 'block')) return;
        const trades = await db.getAllTrades();
        if (trades.length < 3) return;

        const wins = trades.filter(t => t.profitLoss > 0).length;
        const winRate = Math.round(wins / trades.length * 100);
        const disc = trades.filter(t => t.discipline);
        const discipline = disc.length ? Math.round(disc.reduce((s, t) => s + t.discipline, 0) / disc.length / 10 * 100) : 0;
        const journaled = trades.filter(t => t.notes || t.emotionBefore).length;
        const journaling = Math.round(journaled / trades.length * 100);
        const days = {};
        trades.forEach(t => { const k = String(t.entryDate).split('T')[0]; days[k] = (days[k] || 0) + 1; });
        const dayArr = Object.values(days);
        const control = Math.round(dayArr.filter(n => n <= 4).length / dayArr.length * 100);

        const score = Math.round(discipline * .3 + winRate * .3 + journaling * .2 + control * .2);
        const grade = score >= 85 ? ['S', '#2ebd85'] : score >= 70 ? ['A', '#2ebd85'] : score >= 55 ? ['B', '#7c7ff2'] : score >= 40 ? ['C', '#f59e0b'] : ['D', '#e5536b'];

        const C = 2 * Math.PI * 52;
        const card = document.createElement('div');
        card.id = 'scoreCard'; card.className = 'score-card';
        card.innerHTML = `
            <div class="score-gauge">
                <svg viewBox="0 0 120 120">
                    <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
                    <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,.08)" stroke-width="10" fill="none"/>
                    <circle cx="60" cy="60" r="52" stroke="url(#sg)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - score / 100)}"/>
                </svg>
                <div class="num"><b>${score}</b><span>Score</span></div>
            </div>
            <div class="score-right">
                <h4>Trader Scorecard<span class="grade" style="background:${grade[1]}22;color:${grade[1]};border:1px solid ${grade[1]}55;">Grade ${grade[0]}</span></h4>
                <div style="font-size:.75rem;color:var(--text-tertiary);">Computed from your real trading data.</div>
                <div class="score-bars">
                    <div class="sbar"><small><span>Discipline</span><span>${discipline}</span></small><div class="track"><div class="fill" style="width:${discipline}%"></div></div></div>
                    <div class="sbar"><small><span>Win Rate</span><span>${winRate}</span></small><div class="track"><div class="fill" style="width:${winRate}%"></div></div></div>
                    <div class="sbar"><small><span>Journaling</span><span>${journaling}</span></small><div class="track"><div class="fill" style="width:${journaling}%"></div></div></div>
                    <div class="sbar"><small><span>Risk Control</span><span>${control}</span></small><div class="track"><div class="fill" style="width:${control}%"></div></div></div>
                </div>
            </div>`;
        const today = document.getElementById('todayGrid');
        if (today) today.before(card); else dash.querySelector('.dash-header').after(card);
    }

    // ---------- shortcuts sheet ----------
    let keysBox = null;
    function openKeys() {
        if (keysBox) return;
        keysBox = document.createElement('div');
        keysBox.className = 'tv-keys';
        keysBox.innerHTML = `<div class="tv-keys-box">
            <h3>⌨️ Keyboard Shortcuts</h3>
            <div class="tv-key-row"><span>New trade</span><kbd>N</kbd></div>
            <div class="tv-key-row"><span>Find trade</span><kbd>F</kbd></div>
            <div class="tv-key-row"><span>Command palette</span><kbd>Ctrl / ⌘ + K</kbd></div>
            <div class="tv-key-row"><span>This cheat-sheet</span><kbd>?</kbd></div>
            <div class="tv-key-row"><span>Close any overlay</span><kbd>Esc</kbd></div>
        </div>`;
        keysBox.onclick = e => { if (e.target === keysBox) keysBox.remove(), keysBox = null; };
        document.body.appendChild(keysBox);
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && keysBox) { keysBox.remove(); keysBox = null; }
        if (e.key !== '?') return;
        const t = e.target;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
        openKeys();
    });

    function boot() {
        scorecard();
        if (typeof dashboard !== 'undefined' && !dashboard.__scoreHooked) {
            dashboard.__scoreHooked = true;
            const od = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await od(); scorecard(); return r; };
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
    const mc = document.getElementById('mainContent');
    if (mc) new MutationObserver(() => { if (mc.style.display === 'block') scorecard(); }).observe(mc, { attributes: true, attributeFilter: ['style'] });
})();
