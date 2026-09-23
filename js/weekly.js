// ============ TradeVault Weekly Auto-Review ============
(function () {
    const st = document.createElement('style');
    st.textContent = `
        .review-modal { width: min(600px, 92vw); max-height: 85vh; overflow-y: auto; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px; padding: 2rem; box-shadow: 0 25px 50px rgba(0,0,0,.5); }
        .review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; }
        .review-header h2 { margin: 0; font-size: 1.25rem; }
        .review-body { font-size: .9rem; line-height: 1.7; color: var(--text-secondary); white-space: pre-wrap; }
        .review-body strong { color: var(--text-primary); }
        .review-actions { display: flex; gap: .8rem; margin-top: 1.5rem; justify-content: flex-end; }
    `;
    document.head.appendChild(st);

    function generateReview() {
        if (typeof db === 'undefined') return;
        
        // Get trades from last 7 days
        const cutoff = new Date(Date.now() - 7 * 86400000);
        db.getAllTrades().then(trades => {
            const weekTrades = trades.filter(t => new Date(t.entryDate) >= cutoff);
            
            if (weekTrades.length === 0) {
                showToast('No trades recorded in the last 7 days.', 'warning');
                return;
            }

            // Calculations
            const wins = weekTrades.filter(t => t.profitLoss > 0);
            const losses = weekTrades.filter(t => t.profitLoss < 0);
            const winRate = Math.round((wins.length / weekTrades.length) * 100);
            const netPnL = weekTrades.reduce((sum, t) => sum + t.profitLoss, 0);
            
            // Grade Analysis
            const grades = weekTrades.map(t => t.tradeGrade || 'N/A');
            const gradeCounts = {};
            grades.forEach(g => gradeCounts[g] = (gradeCounts[g] || 0) + 1);
            const bestGrade = ['A', 'B', 'C', 'D', 'F'].find(g => gradeCounts[g]) || 'N/A';

            // Mistake Analysis
            const mistakes = {};
            weekTrades.forEach(t => {
                if (t.profitLoss < 0 && t.mistakes) {
                    t.mistakes.split(',').forEach(m => {
                        const cleanM = m.trim();
                        if (cleanM) mistakes[cleanM] = (mistakes[cleanM] || 0) + Math.abs(t.profitLoss);
                    });
                }
            });
            const topMistake = Object.entries(mistakes).sort((a,b) => b[1] - a[1])[0];

            // Build Text
            let text = ` <strong>Weekly Trading Review</strong>\n\n`;
            text += `You took <strong>${weekTrades.length} trades</strong> over the last 7 days.\n`;
            text += `• Win Rate: <strong>${winRate}%</strong> (${wins.length}W / ${losses.length}L)\n`;
            text += `• Net P&L: <strong style="color: ${netPnL >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${formatCurrency(netPnL)}</strong>\n\n`;
            
            text += ` <strong>Execution Quality</strong>\n`;
            text += `Your most common trade grade was <strong>${bestGrade}</strong>.\n`;
            
            if (topMistake) {
                text += `\n⚠️ <strong>Area for Improvement</strong>\n`;
                text += `Your most expensive mistake was "<strong>${topMistake[0]}</strong>", which cost you <strong>${formatCurrency(topMistake[1])}</strong> this week.\n`;
            } else {
                text += `\n✅ <strong>Area for Improvement</strong>\n`;
                text += `No major mistakes recorded this week. Excellent discipline!\n`;
            }

            text += `\n💡 <strong>Focus for Next Week</strong>\n`;
            if (winRate < 40) text += `Focus on trade selection. Your win rate is low; wait for A+ setups only.`;
            else if (netPnL < 0 && winRate > 50) text += `Your winners are too small. Let your winning trades run longer to cover the losses.`;
            else if (netPnL > 0) text += `You are profitable. Stick to the exact routine that got you here.`;
            else text += `Review your trading plan and reduce position size until confidence returns.`;

            showReviewModal(text);
        });
    }

    function showReviewModal(text) {
        const ov = document.getElementById('modalOverlay');
        if (!ov) return;
        
        ov.innerHTML = `
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>📝 Weekly Auto-Review</h2>
                    <button class="modal-close" onclick="app.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="review-body" id="reviewText">${text}</div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('reviewText').innerText); showToast('Copied to clipboard!')">Copy Text</button>
                    <button class="btn btn-primary" onclick="app.closeModal()">Done</button>
                </div>
            </div>
        `;
        ov.classList.add('active');
    }

    // Inject Button into Dashboard
    function injectButton() {
        const dashHeader = document.querySelector('.dash-header');
        if (!dashHeader || document.getElementById('weeklyReviewBtn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'weeklyReviewBtn';
        btn.className = 'btn btn-secondary';
        btn.style.marginLeft = '0.5rem';
        btn.innerHTML = '📝 Weekly Review';
        btn.onclick = generateReview;
        
        // Insert next to Monthly Report button if it exists
        const monthlyBtn = document.getElementById('monthlyReportBtn'); // Assuming this ID exists based on previous context
        if (monthlyBtn) {
            monthlyBtn.after(btn);
        } else {
            dashHeader.appendChild(btn);
        }
    }

    // Boot
    function boot() {
        injectButton();
        // Re-inject if dashboard reloads
        if (typeof dashboard !== 'undefined') {
            const origLoad = dashboard.loadDashboard;
            dashboard.loadDashboard = async function() {
                await origLoad();
                injectButton();
            }
        }
    }

    if (document.readyState === 'complete') setTimeout(boot, 500);
    else window.addEventListener('load', () => setTimeout(boot, 500));
})();
