// Strategies Module

class Strategies {
    async loadStrategies() {
        const strategies = await db.getAllStrategies();
        const trades = await db.getAllTrades();
        const grid = document.getElementById('strategiesGrid');
        if (!grid) return;

        if (strategies.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
                <h3>No strategies yet</h3>
                <p>Create strategies to track which setups work best for you</p>
                <button class="btn btn-primary" onclick="strategies.showStrategyModal()">Add Your First Strategy</button>
            </div>`;
            return;
        }

        grid.innerHTML = strategies.map(s => {
            const sTrades = trades.filter(t => t.strategy === s.name);
            const wins = sTrades.filter(t => t.profitLoss > 0).length;
            const winRate = sTrades.length > 0 ? (wins / sTrades.length) * 100 : 0;
            const pl = sTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);

            return `
            <div class="strategy-card">
                <div class="strategy-header">
                    <div class="strategy-name">${s.name}</div>
                    <button class="table-action-btn delete" onclick="strategies.deleteStrategy(${s.id})">️</button>
                </div>
                <div class="strategy-stats">
                    <div class="strategy-stat"><div class="strategy-stat-label">Trades</div><div class="strategy-stat-value">${sTrades.length}</div></div>
                    <div class="strategy-stat"><div class="strategy-stat-label">Win Rate</div><div class="strategy-stat-value">${formatPercentage(winRate)}</div></div>
                    <div class="strategy-stat"><div class="strategy-stat-label">Net P/L</div><div class="strategy-stat-value ${pl >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(pl)}</div></div>
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
            </div>
        `;
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