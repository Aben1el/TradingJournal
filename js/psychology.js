// Psychology Module

class Psychology {
    async loadPsychology() {
        const trades = await db.getAllTrades();
        
        // Render Insights
        const insightsDiv = document.getElementById('psychologyInsights');
        if (insightsDiv) {
            const insights = analytics.getPsychologyInsights(trades);
            insightsDiv.innerHTML = insights.map(i => `<div class="insight-item"><div class="insight-text">${i}</div></div>`).join('');
        }

        // Render Emotion Stats
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
                    </div>
                `).join('');
            }
        }
    }
}

const psychology = new Psychology();