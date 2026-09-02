// ============ TradeVault Coach Corner (on-device coaching engine) ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .coach-card { margin: 0 0 1.5rem; padding: 1.4rem 1.6rem; border-radius: 16px; border: 1px solid rgba(139,92,246,.3); background: linear-gradient(135deg, rgba(99,102,241,.08), rgba(139,92,246,.04)); backdrop-filter: blur(14px); animation: cardIn .5s ease backwards; }
        .coach-head { display: flex; align-items: center; gap: .7rem; margin-bottom: .8rem; }
        .coach-head .ico { width: 38px; height: 38px; border-radius: 12px; background: rgba(139,92,246,.15); border: 1px solid rgba(139,92,246,.4); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .coach-head strong { font-size: .95rem; }
        .coach-head small { display: block; color: var(--text-tertiary); font-size: .65rem; }
        .coach-body { font-size: .875rem; line-height: 1.8; color: var(--text-secondary); }
        .coach-body b { color: var(--text-primary); }
        .coach-refresh { margin-top: .9rem; }
    `;
    document.head.appendChild(st);

    const KW = [
        ['fomo', /fomo|missing out/i], ['revenge', /revenge|angry|mad at/i], ['tired', /tired|sleep|exhaust/i],
        ['fear', /fear|scared|afraid|hesitat/i], ['greed', /greed|greedy/i], ['rushed', /rush|hurry|late entry/i],
        ['confident', /confident/i], ['patient', /patient|waited/i], ['disciplined', /disciplin|followed (the )?plan/i]
    ];

    async function coach() {
        const dash = document.getElementById('dashboard');
        const main = document.getElementById('mainContent');
        if (!dash || document.getElementById('coachCard') || typeof db === 'undefined') return;
        if (!(main && main.style.display === 'block')) return;
        const trades = await db.getAllTrades();
        if (trades.length < 5) return;

        const sum = a => a.reduce((s, t) => s + (t.profitLoss || 0), 0);
        const avg = a => a.length ? sum(a) / a.length : 0;
        const lines = [];

        // keyword leaks
        const leaks = [];
        const strengths = [];
        KW.forEach(([name, re]) => {
            const hit = trades.filter(t => re.test(t.notes || '') || re.test(t.emotionBefore || ''));
            if (hit.length >= 2) {
                const a = avg(hit);
                if (a < 0 && /fomo|revenge|tired|fear|greed|rushed/.test(name)) leaks.push([name, a, hit.length]);
                if (a > 0 && /confident|patient|disciplined/.test(name)) strengths.push([name, a, hit.length]);
            }
        });

        // session edge
        const sess = {};
        trades.forEach(t => { if (t.session) { sess[t.session] = sess[t.session] || { n: 0, w: 0 }; sess[t.session].n++; if (t.profitLoss > 0) sess[t.session].w++; } });
        const se = Object.entries(sess).filter(([, v]) => v.n >= 3).map(([k, v]) => [k, Math.round(v.w / v.n * 100)]);
        let sessionLine = '';
        if (se.length >= 2) {
            se.sort((a, b) => b[1] - a[1]);
            if (se[0][1] - se[se.length - 1][1] >= 10) sessionLine = `Your edge lives in the <b>${se[0][0]} session (${se[0][1]}% win)</b> vs ${se[se.length - 1][1]}% elsewhere. This week, take only ${se[0][0]} setups.`;
        }

        // plan gap
        const withChk = trades.filter(t => t.checklist !== undefined && t.checklist !== null);
        let planLine = '';
        if (withChk.length >= 2) {
            const on = withChk.filter(t => t.checklist >= 4), off = withChk.filter(t => t.checklist < 4);
            if (on.length && off.length && sum(on) > sum(off)) planLine = `Followed-plan trades are out-earning off-plan trades by <b>${formatCurrency(sum(on) - sum(off))}</b>. Your strategy works — the job is obedience.`;
        }

        // streak
        const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
        let cur = 0;
        for (const t of sorted) cur = t.profitLoss < 0 ? cur + 1 : 0;
        const streakLine = cur >= 2 ? `You're ${cur} losses deep. Size down to half risk until the streak breaks — protect confidence first, money second.` : '';

        // compose
        if (strengths.length) lines.push(`When you trade <b>${strengths[0][0]}</b> (${strengths[0][2]} trades), you average <b>+${formatCurrency(strengths[0][1])}</b> — that mental state is your real edge.`);
        if (leaks.length) lines.push(`Your biggest leak: trades tagged with "<b>${leaks[0][0]}</b>" average <b>${formatCurrency(leaks[0][1])}</b>. The moment you feel it, walk away — that feeling is expensive.`);
        if (sessionLine) lines.push(sessionLine);
        if (planLine) lines.push(planLine);
        if (streakLine) lines.push(streakLine);
        if (!lines.length) lines.push(`Sample is growing nicely (${trades.length} trades). Keep journaling emotions and notes — patterns need ~20+ trades before I can coach you precisely.`);

        const card = document.createElement('div');
        card.id = 'coachCard'; card.className = 'coach-card';
        card.innerHTML = `
            <div class="coach-head">
                <div class="ico">🤖</div>
                <div><strong>Coach Corner</strong><small>On-device coaching engine · private · no data leaves your account</small></div>
            </div>
            <div class="coach-body">${lines.map(l => '• ' + l).join('<br>')}</div>
            <button class="btn btn-secondary coach-refresh" id="coachRefresh">↻ Re-read my data</button>`;
        const score = document.getElementById('scoreCard');
        if (score) score.after(card); else dash.querySelector('.dash-header').after(card);
        card.querySelector('#coachRefresh').onclick = () => { card.remove(); coach(); };
    }

    function boot() {
        coach();
        if (typeof dashboard !== 'undefined' && !dashboard.__coachHooked) {
            dashboard.__coachHooked = true;
            const od = dashboard.loadDashboard.bind(dashboard);
            dashboard.loadDashboard = async function () { const r = await od(); coach(); return r; };
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
    const mc = document.getElementById('mainContent');
    if (mc) new MutationObserver(() => { if (mc.style.display === 'block') coach(); }).observe(mc, { attributes: true, attributeFilter: ['style'] });
})();
