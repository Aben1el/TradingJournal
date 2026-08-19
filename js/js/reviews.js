// Reviews Module — Daily / Weekly / Monthly journal reviews

const REVIEW_FIELDS = {
    daily: [
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'whatHappened', label: 'What happened today?', type: 'textarea' },
        { name: 'didWell', label: 'What did I do well?', type: 'textarea' },
        { name: 'mistakes', label: 'What mistakes did I make?', type: 'textarea' },
        { name: 'discipline', label: 'Discipline (1-10)', type: 'number' },
        { name: 'psychology', label: 'How was my psychology?', type: 'textarea' }
    ],
    weekly: [
        { name: 'date', label: 'Week Of', type: 'date' },
        { name: 'biggestLesson', label: 'Biggest lesson', type: 'textarea' },
        { name: 'bestTrade', label: 'Best trade', type: 'text' },
        { name: 'worstTrade', label: 'Worst trade', type: 'text' },
        { name: 'biggestMistake', label: 'Biggest mistake', type: 'textarea' },
        { name: 'improveNextWeek', label: 'What to improve next week', type: 'textarea' }
    ],
    monthly: [
        { name: 'date', label: 'Month', type: 'month' },
        { name: 'performance', label: 'Monthly performance summary', type: 'textarea' },
        { name: 'biggestImprovement', label: 'Biggest improvement', type: 'textarea' },
        { name: 'biggestWeakness', label: 'Biggest weakness', type: 'textarea' },
        { name: 'bestStrategy', label: 'Best strategy', type: 'text' },
        { name: 'worstHabit', label: 'Worst habit', type: 'text' },
        { name: 'nextMonthGoals', label: "Next month's goals", type: 'textarea' }
    ]
};

class Reviews {
    constructor() {
        this.currentType = 'daily';
        this.initialized = false;
    }

    init() {
        if (this.initialized) { this.refresh(); return; }
        this.initialized = true;
        document.querySelectorAll('.review-tabs .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.review-tabs .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentType = e.target.dataset.review;
                this.renderForm();
                this.loadReviews();
            });
        });
        this.renderForm();
        this.loadReviews();
    }

    refresh() { this.renderForm(); this.loadReviews(); }

    renderForm() {
        const card = document.getElementById('reviewFormCard');
        if (!card) return;
        const fields = REVIEW_FIELDS[this.currentType];
        const titles = { daily: 'Daily Review', weekly: 'Weekly Review', monthly: 'Monthly Review' };
        const today = new Date().toISOString().split('T')[0];

        card.innerHTML = `
            <h3>${titles[this.currentType]}</h3>
            <form id="reviewForm">
                ${fields.map(f => {
                    if (f.type === 'textarea') {
                        return `<div class="form-group"><label>${f.label}</label><textarea class="form-control" name="${f.name}" rows="2"></textarea></div>`;
                    }
                    const val = f.type === 'date' ? `value="${today}"` : f.type === 'month' ? `value="${getMonthKey(new Date())}"` : '';
                    const step = f.type === 'number' ? 'min="1" max="10"' : '';
                    return `<div class="form-group"><label>${f.label}</label><input type="${f.type}" class="form-control" name="${f.name}" ${val} ${step} ${f.name === 'date' ? 'required' : ''}></div>`;
                }).join('')}
                <button type="button" class="btn btn-primary" id="saveReviewBtn">Save Review</button>
            </form>`;

        document.getElementById('saveReviewBtn').onclick = async () => {
            const form = document.getElementById('reviewForm');
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const data = Object.fromEntries(new FormData(form).entries());
            data.type = this.currentType;
            if (data.discipline) data.discipline = parseInt(data.discipline);
            await db.addReview(data);
            showToast('Review saved!');
            this.renderForm();
            this.loadReviews();
        };
    }

    async loadReviews() {
        const list = document.getElementById('reviewList');
        if (!list) return;
        const all = await db.getAllReviews();
        const items = all.filter(r => r.type === this.currentType)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (items.length === 0) {
            list.innerHTML = `<div class="empty-state"><h3>No reviews yet</h3><p>Write your first review using the form.</p></div>`;
            return;
        }

        const fields = REVIEW_FIELDS[this.currentType];
        list.innerHTML = items.map(r => `
            <div class="review-item">
                <div class="review-item-header">
                    <h4>${formatDate(r.date)}</h4>
                    <button class="table-action-btn delete" onclick="reviews.deleteReview(${r.id})">🗑️</button>
                </div>
                ${fields.filter(f => f.name !== 'date' && r[f.name]).map(f => `<p><strong>${f.label}:</strong> ${r[f.name]}</p>`).join('')}
            </div>`).join('');
    }

    async deleteReview(id) {
        if (await confirmDialog('Delete this review?')) {
            await db.deleteReview(id);
            showToast('Review deleted');
            this.loadReviews();
        }
    }
}

const reviews = new Reviews();
