// ============ TradeVault Trade Grader & Cost of Mistakes ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .grade-badge { padding: .2rem .7rem; border-radius: 100px; font-size: .75rem; font-weight: 800; margin-left: .8rem; vertical-align: middle; }
        .grade-A { background: rgba(46,189,133,.15); color: #2ebd85; border: 1px solid rgba(46,189,133,.4); }
        .grade-B { background: rgba(99,102,241,.15); color: #7c7ff2; border: 1px solid rgba(99,102,241,.4); }
        .grade-C { background: rgba(245,158,11,.15); color: #f59e0b; border: 1px solid rgba(245,158,11,.4); }
        .grade-D { background: rgba(249,115,22,.15); color: #f97316; border: 1px solid rgba(249,115,22,.4); }
        .grade-F { background: rgba(229,83,107,.15); color: #e5536b; border: 1px solid rgba(229,83,107,.4); }
        .grade-live { position: absolute; top: 1rem; right: 1rem; }
    `;
    document.head.appendChild(st);

    const BAD_EMOTIONS = ['FOMO', 'Fear', 'Greedy', 'Anxious'];

    function calculateGrade(form) {
        let score = 100;
        // Checklist (5 items)
        const checks = form.querySelectorAll('.tf-mk input[type="checkbox"]:not([name="ruleBroken"])');
        let checkedCount = 0;
        checks.forEach(c => { if (c.checked) checkedCount++; });
        // If checklist exists, deduct for missing. If no checklist, neutral.
        if (checks.length > 0) {
            const missing = checks.length - checkedCount;
            score -= missing * 10;
        }
        // Rule broken
        const ruleBroken = form.querySelector('[name="ruleBroken"]');
        if (ruleBroken && ruleBroken.checked) score -= 30;
        // Bad emotions
        const emo = form.querySelector('[name="emotionBefore"]');
        if (emo && BAD_EMOTIONS.includes(emo.value)) score -= 20;
        
        score = Math.max(0, Math.min(100, score));
        let grade = 'F';
        if (score >= 90) grade = 'A';
        else if (score >= 80) grade = 'B';
        else if (score >= 70) grade = 'C';
        else if (score >= 60) grade = 'D';
        return { score, grade };
    }

    // 1. Inject Live Grade into Add Trade Modal
    new MutationObserver(() => {
        const modal = document.querySelector('.modal');
        if (!modal || modal.dataset.graded) return;
        const form = document.getElementById('tradeForm');
        if (!form) return;
        modal.dataset.graded = '1';

        const header = modal.querySelector('.modal-header h2');
        const badge = document.createElement('span');
        badge.className = 'grade-badge grade-A';
        badge.textContent = 'Grade: A';
        header.appendChild(badge);

        const updateGrade = () => {
            const { grade, score } = calculateGrade(form);
            badge.textContent = `Grade: ${grade} (${score})`;
            badge.className = `grade-badge grade-${grade}`;
        };

        form.addEventListener('input', updateGrade);
        form.addEventListener('change', updateGrade);
        updateGrade();

        // Hook save to attach grade
        const saveBtn = document.getElementById('tfSave');
        if (saveBtn) {
            const origClick = saveBtn.onclick;
            saveBtn.onclick = async (e) => {
                const { grade, score } = calculateGrade(form);
                // Store grade in form dataset for trades.js to pick up
                form.dataset.tradeGrade = grade;
                form.dataset.tradeScore = score;
                if (origClick) await origClick(e);
            };
        }
    }).observe(document.body, { childList: true, subtree: true });

    // 2. Hook db.save to include grade (Wrapping trades.js save)
    if (typeof db !== 'undefined' && !db.__gradeHook) {
        db.__gradeHook = true;
        const origAdd = db.addTrade.bind(db);
        db.addTrade = async (data) => {
            const form = document.getElementById('tradeForm');
            if (form && form.dataset.tradeGrade) {
                data.tradeGrade = form.dataset.tradeGrade;
                data.tradeScore = parseInt(form.dataset.tradeScore);
            }
            return origAdd(data);
        };
        const origUpd = db.updateTrade.bind(db);
        db.updateTrade = async (data) => {
            const form = document.getElementById('tradeForm');
            if (form && form.dataset.tradeGrade) {
                data.tradeGrade = form.dataset.tradeGrade;
                data.tradeScore = parseInt(form.dataset.tradeScore);
            }
            return origUpd(data);
        };
    }

    // 3. Cost of Mistakes Chart in Analytics
    async function costOfMistakes() {
        const grid = document.querySelector('.analytics-full-grid');
        if (!grid || document.getElementById('costCard') || typeof Chart === 'undefined' || typeof db === 'undefined') return;
        const trades = await db.getAllTrades();
        if (!trades.length) return;

        const mistakes = {};
        trades.forEach(t => {
            if (t.profitLoss < 0) { // Only count losses
                const ms = (t.mistakes || '').split(',').map(s => s.trim()).filter(Boolean);
                ms.forEach(m => { mistakes[m] = (mistakes[m] || 0) + Math.abs(t.profitLoss); });
            }
            // Also count bad emotions as "mistakes"
            if (t.profitLoss < 0 && BAD_EMOTIONS.includes(t.emotionBefore)) {
                const key = `Emotion: ${t.emotionBefore}`;
                mistakes[key] = (mistakes[key] || 0) + Math.abs(t.profitLoss);
            }
        });

        const entries = Object.entries(mistakes).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (!entries.length) return;

        grid.insertAdjacentHTML('beforeend', `
            <div class="chart-container" id="costCard">
                <h3>💸 Cost of Mistakes (Top 5)</h3>
                <canvas id="costCanvas"></canvas>
            </div>`);
        
        new Chart(document.getElementById('costCanvas'), {
            type: 'bar',
            data: {
                labels: entries.map(e => e[0]),
                datasets: [{
                    label: 'Cost ($)',
                    data: entries.map(e => e[1]),
                    backgroundColor: 'rgba(229,83,107,.7)',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#8a8a93', callback: v => '$' + v }, grid: { color: 'rgba(255,255,255,.05)' } },
                    y: { ticks: { color: '#c9c9d2' }, grid: { display: false } }
                }
            }
        });
    }

    function boot() {
        if (typeof dashboard !== 'undefined' && !dashboard.__gradeHooked) {
            dashboard.__gradeHooked = true;
            if (dashboard.loadAnalytics) {
                const oa = dashboard.loadAnalytics.bind(dashboard);
                dashboard.loadAnalytics = async function () { const r = await oa(); costOfMistakes(); return r; };
            }
        }
    }
    if (document.readyState === 'complete') setTimeout(boot, 300);
    else window.addEventListener('load', () => setTimeout(boot, 300));
})();
