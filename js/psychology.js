// Psychology Module — connects mindset to real performance

class Psychology {
    async loadPsychology() {
        const trades = await db.getAllTrades();

        this.renderDisciplineBands(trades);

        const insightsDiv = document.getElementById('psychologyInsights');
        if (insightsDiv) {
            const insights = analytics.getPsychologyInsights(trades);
            insightsDiv.innerHTML = insights.map(i => `<div class="insight-item"><div class="insight-text">${i}</div></div>`).join('');
        }

        const emotionDiv = document.getElementById('emotionStats');
        if (emotionDiv) {
            const emotions = analytics.getEmotionStats(trades);
            if (emotions.length === 0) {
                emotionDiv.innerHTML = '<p class="text-secondary">Track emotions in your trades to see patterns here.</p>';
            } else {
                emotionDiv.innerHTML = emotions.map(e => `
                    <div class="emotion-item">
                        <span class="emotion-name">${e.emotion} (${e.count} trades)</span>
                        <span class="emotion-value ${e.avgPL >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(e.avgPL)} avg</span>
                    </div>`).join('');
            }
        }
    }

    renderDisciplineBands(trades) {
        const el = document.getElementById('disciplineBands');
        if (!el) return;
        const bands = analytics.getDisciplineBands(trades);
        const hasData = bands.some(b => b.count > 0);
        if (!hasData) {
            el.innerHTML = `<p class="text-secondary" style="grid-column:1/-1;">Record discipline ratings (1-10) in your trades to see how discipline affects your results.</p>`;
            return;
        }
        el.innerHTML = bands.map(b => `
            <div class="band-card">
                <div class="band-label">${b.label}</div>
                <div class="band-value ${b.avgPL > 0 ? 'text-success' : b.avgPL < 0 ? 'text-danger' : ''}">${b.count > 0 ? formatCurrency(b.avgPL) : '—'}</div>
                <div class="band-sub">${b.count > 0 ? `avg P/L · ${formatPercentage(b.winRate)} win rate · ${b.count} trades` : 'No data'}</div>
            </div>`).join('');
    }
}

const psychology = new Psychology();
