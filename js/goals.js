// Goals Module

class Goals {
    async loadGoals() {
        const goals = await db.getAllGoals();
        const trades = await db.getAllTrades();
        const grid = document.getElementById('goalsGrid');
        if (!grid) return;

        if (goals.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
                <h3>No goals yet</h3>
                <p>Set trading goals to stay focused and disciplined</p>
                <button class="btn btn-primary" onclick="goals.showGoalModal()">Add Your First Goal</button>
            </div>`;
            return;
        }

        grid.innerHTML = goals.map(g => {
            let progress = 0;
            let current = 0;
            let target = g.target || 0;

            if (g.type === 'trades') {
                current = trades.length;
                progress = Math.min(100, (current / target) * 100);
            } else if (g.type === 'wins') {
                current = trades.filter(t => t.profitLoss > 0).length;
                progress = Math.min(100, (current / target) * 100);
            } else {
                progress = g.progress || 0;
                current = Math.round((progress / 100) * target);
            }

            return `
            <div class="goal-card">
                <div class="goal-header">
                    <div class="goal-title">${g.title}</div>
                    <button class="table-action-btn delete" onclick="goals.deleteGoal(${g.id})">️</button>
                </div>
                <div class="goal-progress">
                    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                    <div class="progress-text"><span>${current} / ${target}</span><span>${Math.round(progress)}%</span></div>
                </div>
                <div class="goal-meta"><span>Type: ${g.type}</span><span>Deadline: ${g.deadline || 'None'}</span></div>
            </div>`;
        }).join('');
    }

    showGoalModal() {
        const overlay = document.getElementById('modalOverlay');
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header"><h2>Add Goal</h2><button class="modal-close" onclick="app.closeModal()">✕</button></div>
            <div class="modal-body">
                <form id="goalForm">
                    <div class="form-group"><label>Goal Title *</label><input type="text" class="form-control" name="title" required></div>
                    <div class="form-group"><label>Type</label><select class="form-control" name="type"><option value="trades">Number of Trades</option><option value="wins">Number of Wins</option><option value="custom">Custom Progress</option></select></div>
                    <div class="form-group"><label>Target *</label><input type="number" class="form-control" name="target" required></div>
                    <div class="form-group"><label>Deadline</label><input type="date" class="form-control" name="deadline"></div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                <button class="btn btn-primary" id="saveGoalBtn">Save</button>
            </div>
        `;
        overlay.appendChild(modal);
        overlay.classList.add('active');

        document.getElementById('saveGoalBtn').onclick = async () => {
            const form = document.getElementById('goalForm');
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const data = Object.fromEntries(new FormData(form).entries());
            data.target = parseInt(data.target);
            data.progress = 0;
            await db.addGoal(data);
            showToast('Goal added!');
            app.closeModal();
            this.loadGoals();
        };
    }

    async deleteGoal(id) {
        if (await confirmDialog('Delete this goal?')) {
            await db.deleteGoal(id);
            showToast('Goal deleted');
            this.loadGoals();
        }
    }
}

const goals = new Goals();