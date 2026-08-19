// Strategies Module — full analytics + comparison table

class Strategies {
    async loadStrategies() {
        const strategies = await db.getAllStrategies();
        const trades = await db.getAllTrades();
        const stats = analytics.getStrategyStats(trades);

        this.renderTable(stats);
        this.renderCards(strategies, stats);
    }

    renderTable(stats) {
        const wrap = document.getElementById('strategyTableWrap');
        if (!wrap) return;
        const rows = Object.entries(stats);
        if (rows.length === 0) {
            wrap.innerHTML = `<div class="empty-state"><h3>No strategy data yet</h3><p>Assign strategies to your trades to compare their performance here.</p></div>`;
            return;
        }
        rows.sort((a, b) => b[1].pl - a[1].pl);
        wrap.innerHTML = `
            <table class="trades-table">
                <thead><tr><th>Strategy</th><th>Trades</th><th>Win Rate</th><th>Net P/L</th><th>Avg R</th><th>Profit Factor</th><th>Best</th><th>Worst</th></tr></thead>
                <tbody>
                    ${rows.map(([name, s]) => `
                        <tr style="cursor:default;">
                            <td><strong>${name}</strong></td>
                            <td>${s.trades}</td>
                            <td>${formatPercentage(s.winRate)}</td>
                            <td class="${s.pl >= 0 ? 'text-success' : 'text-danger'}"><strong>${formatCurrency(s.pl)}</strong></td>
                            <td>${formatNumber(s.avgR, 2)}R</td>
                            <td>${s.profitFactor === Infinity ? '∞' : formatNumber(s.profitFactor, 2)}</td>
                            <td class="text-success">${formatCurrency(s.best)}</td>
                            <td class="text-danger">${formatCurrency(s.worst)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    }

    renderCards(strategies, stats) {
        const grid = document.getElementById('strategiesGrid');
        if (!grid) return;
        if (strategies.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
                <h3>No strategies yet</h3>
                <p>Create strategies to track which setups work best for you</p>
                <button class="btn btn-primary" onclick="strategies.showStrategyModal()">Add Your First Strategy</button>
            </div>`;
            return;
        }
        grid.innerHTML = strategies.map(s => {
            const st = stats[s.name] || { trades: 0, winRate: 0, pl: 0 };
            return `
            <div class="strategy-card">
                <div class="strategy-header">
                    <div class="strategy-name">${s.name}</div>
                    <button class="table-action-btn delete" onclick="strategies.deleteStrategy(${s.id})">🗑️</button>
                </div>
                <div class="strategy-stats">
                    <div class="strategy-stat"><div class="strategy-stat-label">Trades</div><div class="strategy-stat-value">${st.trades}</div></div>
                    <div class="strategy-stat"><div class="strategy-stat-label">Win Rate</div><div class="strategy-stat-value">${formatPercentage(st.winRate)}</div></div>
                    <div class="strategy-stat"><div class="strategy-stat-label">Net P/L</div><div class="strategy-stat-value ${st.pl >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(st.pl)}</div></div>
                    <div class="strategy-stat"><div class="strategy-stat-label">Description</div><div class="strategy-stat-value" style="font-size:0.8rem; color:var(--text-secondary);">${s.description || 'No description'}</div></div>
                </div>
            </div>`;
        }).join('');
    }

    showStrategyModal() {
        const overlay = document.getElementById('modalOverlay');
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header"><h2>Add Strategy</h2><button class="modal-close" onclick="app.closeModal()">✕</button></div>
            <div class="modal-body">
                <form id="strategyForm">
                    <div class="form-group"><label>Strategy Name *</label><input type="text" class="form-control" name="name" required></div>
                    <div class="form-group"><label>Description</label><textarea class="form-control" name="description" rows="3"></textarea></div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                <button class="btn btn-primary" id="saveStrategyBtn">Save</button>
            </div>`;
        overlay.appendChild(modal);
        overlay.classList.add('active');

        document.getElementById('saveStrategyBtn').onclick = async () => {
            const form = document.getElementById('strategyForm');
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const data = Object.fromEntries(new FormData(form).entries());
            await db.addStrategy(data);
            showToast('Strategy added!');
            app.closeModal();
            this.loadStrategies();
        };
    }

    async deleteStrategy(id) {
        if (await confirmDialog('Delete this strategy?')) {
            await db.deleteStrategy(id);
            showToast('Strategy deleted');
            this.loadStrategies();
        }
    }
}

const strategies = new Strategies();
