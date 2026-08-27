// Trades Module — CRUD, filters, screenshots + CSV import/export

// ---------- CSV helpers ----------
function tradesToCSV(trades) {
    const headers = ['entryDate','symbol','market','direction','entryPrice','exitPrice','stopLoss','positionSize','profitLoss','rMultiple','strategy','session','emotionBefore','discipline','confidence','notes'];
    const esc = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const rows = trades.map(t => headers.map(h => esc(t[h])).join(','));
    return [headers.join(','), ...rows].join('\n');
}

function parseCSVText(text) {
    const rows = [];
    let cur = '', row = [], inQ = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQ) {
            if (c === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; }
                else inQ = false;
            } else cur += c;
        } else if (c === '"') inQ = true;
        else if (c === ',') { row.push(cur); cur = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cur); cur = '';
            if (row.some(x => x.trim() !== '')) rows.push(row);
            row = [];
        } else cur += c;
    }
    row.push(cur);
    if (row.some(x => x.trim() !== '')) rows.push(row);
    return rows;
}

const CSV_ALIASES = {
    entrydate: 'entryDate', date: 'entryDate', opendate: 'entryDate', time: 'entryDate',
    symbol: 'symbol', asset: 'symbol', pair: 'symbol', instrument: 'symbol',
    market: 'market',
    direction: 'direction', side: 'direction', type: 'direction',
    entryprice: 'entryPrice', entry: 'entryPrice', openprice: 'entryPrice',
    exitprice: 'exitPrice', exit: 'exitPrice', closeprice: 'exitPrice',
    stoploss: 'stopLoss', sl: 'stopLoss',
    positionsize: 'positionSize', size: 'positionSize', quantity: 'positionSize', units: 'positionSize', volume: 'positionSize',
    profitloss: 'profitLoss', pl: 'profitLoss', pnl: 'profitLoss', profit: 'profitLoss',
    rmultiple: 'rMultiple', r: 'rMultiple',
    strategy: 'strategy', setup: 'strategy',
    session: 'session',
    emotionbefore: 'emotionBefore', emotion: 'emotionBefore',
    discipline: 'discipline',
    confidence: 'confidence',
    notes: 'notes', thesis: 'notes', comment: 'notes'
};

class Trades {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filters = { search: '', asset: '', strategy: '', result: '', direction: '' };
        this.setupCSVButtons();
    }

    // Auto-injects Export/Import CSV buttons (no HTML change needed)
    setupCSVButtons() {
        const actions = document.querySelector('#trades .header-actions');
        if (!actions || document.getElementById('exportCsvBtn')) return;

        const exp = document.createElement('button');
        exp.id = 'exportCsvBtn';
        exp.className = 'btn btn-secondary';
        exp.textContent = 'Export CSV';

        const imp = document.createElement('button');
        imp.id = 'importCsvBtn';
        imp.className = 'btn btn-secondary';
        imp.textContent = 'Import CSV';

        actions.appendChild(exp);
        actions.appendChild(imp);

        exp.addEventListener('click', async () => {
            const trades = await db.getAllTrades();
            if (!trades || trades.length === 0) { showToast('No trades to export yet', 'warning'); return; }
            const csv = tradesToCSV(trades);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tradevault-trades-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('CSV exported successfully!');
        });

        imp.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,text/csv';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const rows = parseCSVText(await file.text());
                    if (rows.length < 2) { showToast('CSV has no data rows', 'error'); return; }
                    const headers = rows[0].map(h => CSV_ALIASES[h.trim().toLowerCase()] || null);
                    let count = 0;
                    for (let i = 1; i < rows.length; i++) {
                        const trade = {};
                        rows[i].forEach((val, idx) => {
                            const key = headers[idx];
                            if (key && val !== undefined && val !== '') trade[key] = val;
                        });
                        if (!trade.symbol) continue;

                        let dir = String(trade.direction || '').toLowerCase();
                        trade.direction = dir.startsWith('b') ? 'long' : dir.startsWith('s') ? 'short' : (dir === 'long' || dir === 'short' ? dir : 'long');
                        trade.entryPrice = parseFloat(trade.entryPrice) || 0;
                        trade.exitPrice = parseFloat(trade.exitPrice) || 0;
                        trade.stopLoss = parseFloat(trade.stopLoss) || undefined;
                        trade.positionSize = parseFloat(trade.positionSize) || undefined;
                        trade.profitLoss = parseFloat(trade.profitLoss);
                        if (isNaN(trade.profitLoss) && trade.entryPrice && trade.exitPrice && trade.positionSize) {
                            trade.profitLoss = calculatePL(trade.entryPrice, trade.exitPrice, trade.direction, trade.positionSize);
                        }
                        trade.profitLoss = isNaN(trade.profitLoss) ? 0 : trade.profitLoss;
                        trade.rMultiple = parseFloat(trade.rMultiple) || (trade.stopLoss ? calculateRMultiple(trade.entryPrice, trade.exitPrice, trade.stopLoss, trade.direction) : undefined);
                        trade.discipline = parseInt(trade.discipline) || undefined;
                        trade.confidence = parseInt(trade.confidence) || undefined;
                        if (!trade.entryDate) trade.entryDate = new Date().toISOString().split('T')[0];

                        await db.addTrade(trade);
                        count++;
                    }
                    showToast(`Imported ${count} trades!`);
                    this.loadTrades();
                    dashboard.loadDashboard();
                } catch (err) {
                    console.error(err);
                    showToast('Invalid CSV file', 'error');
                }
            };
            input.click();
        });
    }

    async loadTrades() {
        const trades = await db.getAllTrades();
        const filtered = this.applyFilters(trades);
        const sorted = [...filtered].sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
        
        this.renderJournalView(sorted);
        this.renderTableView(sorted);
        this.updateFilterOptions(trades);
    }

    applyFilters(trades) {
        return trades.filter(t => {
            if (this.filters.search) {
                const s = this.filters.search.toLowerCase();
                if (!(t.symbol || '').toLowerCase().includes(s) && !(t.strategy || '').toLowerCase().includes(s)) return false;
            }
            if (this.filters.asset && t.symbol !== this.filters.asset) return false;
            if (this.filters.strategy && t.strategy !== this.filters.strategy) return false;
            if (this.filters.result === 'win' && t.profitLoss <= 0) return false;
            if (this.filters.result === 'loss' && t.profitLoss >= 0) return false;
            if (this.filters.direction && t.direction !== this.filters.direction) return false;
            return true;
        });
    }

    renderJournalView(trades) {
        const grid = document.getElementById('journalGrid');
        if (!grid) return;

        if (trades.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">
                <h3>No trades yet</h3>
                <p>Start recording your trades to build your journal</p>
                <button class="btn btn-primary" onclick="trades.showTradeModal()">Add Your First Trade</button>
            </div>`;
            return;
        }

        grid.innerHTML = trades.map(t => `
            <div class="trade-card" onclick="trades.showTradeDetail(${t.id})">
                <div class="trade-card-header">
                    <div class="trade-symbol">${t.symbol || 'Unknown'}</div>
                    <div class="trade-direction ${t.direction}">${t.direction || 'N/A'}</div>
                </div>
                <div class="trade-card-body">
                    <div class="trade-info"><div class="trade-info-label">Entry</div><div class="trade-info-value">${formatNumber(t.entryPrice, 5)}</div></div>
                    <div class="trade-info"><div class="trade-info-label">Exit</div><div class="trade-info-value">${formatNumber(t.exitPrice, 5)}</div></div>
                    <div class="trade-info"><div class="trade-info-label">Strategy</div><div class="trade-info-value">${t.strategy || 'N/A'}</div></div>
                    <div class="trade-info"><div class="trade-info-label">R Multiple</div><div class="trade-info-value">${formatNumber(t.rMultiple, 2)}R</div></div>
                </div>
                <div class="trade-card-footer">
                    <div class="trade-pl ${t.profitLoss >= 0 ? 'positive' : 'negative'}">${formatCurrency(t.profitLoss)}</div>
                    <div class="trade-date">${formatDate(t.entryDate)}</div>
                </div>
            </div>
        `).join('');
    }

    renderTableView(trades) {
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody) return;

        if (trades.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:3rem;">No trades found</td></tr>`;
            return;
        }

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const pageTrades = trades.slice(start, start + this.itemsPerPage);

        tbody.innerHTML = pageTrades.map(t => `
            <tr onclick="trades.showTradeDetail(${t.id})">
                <td>${formatDate(t.entryDate)}</td>
                <td><strong>${t.symbol || 'N/A'}</strong></td>
                <td><span class="badge ${t.direction === 'long' ? 'badge-success' : 'badge-danger'}">${t.direction || 'N/A'}</span></td>
                <td>${formatNumber(t.entryPrice, 5)}</td>
                <td>${formatNumber(t.exitPrice, 5)}</td>
                <td class="${t.profitLoss >= 0 ? 'text-success' : 'text-danger'}"><strong>${formatCurrency(t.profitLoss)}</strong></td>
                <td>${formatNumber(t.rMultiple, 2)}R</td>
                <td>${t.strategy || 'N/A'}</td>
                <td><span class="badge ${t.profitLoss > 0 ? 'badge-success' : t.profitLoss < 0 ? 'badge-danger' : 'badge-neutral'}">${t.profitLoss > 0 ? 'Win' : t.profitLoss < 0 ? 'Loss' : 'BE'}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="table-action-btn" onclick="event.stopPropagation(); trades.showTradeModal(${t.id})">✏️</button>
                        <button class="table-action-btn delete" onclick="event.stopPropagation(); trades.deleteTrade(${t.id})">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateFilterOptions(trades) {
        const assets = [...new Set(trades.map(t => t.symbol).filter(Boolean))];
        const assetFilter = document.getElementById('filterAsset');
        if (assetFilter) {
            const val = assetFilter.value;
            assetFilter.innerHTML = '<option value="">All Assets</option>' + assets.map(a => `<option value="${a}" ${a===val?'selected':''}>${a}</option>`).join('');
        }

        const strategies = [...new Set(trades.map(t => t.strategy).filter(Boolean))];
        const stratFilter = document.getElementById('filterStrategy');
        if (stratFilter) {
            const val = stratFilter.value;
            stratFilter.innerHTML = '<option value="">All Strategies</option>' + strategies.map(s => `<option value="${s}" ${s===val?'selected':''}>${s}</option>`).join('');
        }
    }

    async showTradeModal(tradeId = null) {
        const overlay = document.getElementById('modalOverlay');
        let trade = tradeId ? await db.getTrade(tradeId) : null;
        const strategies = await db.getAllStrategies();
        const stratOptions = strategies.map(s => `<option value="${s.name}" ${trade && trade.strategy === s.name ? 'selected' : ''}>${s.name}</option>`).join('');

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h2>${tradeId ? 'Edit' : 'Add'} Trade</h2>
                <button class="modal-close" onclick="app.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="tradeForm">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
                        <div class="form-group"><label>Symbol/Asset *</label><input type="text" class="form-control" name="symbol" value="${trade?.symbol || ''}" required></div>
                        <div class="form-group"><label>Market</label><select class="form-control" name="market"><option value="forex" ${trade?.market==='forex'?'selected':''}>Forex</option><option value="crypto" ${trade?.market==='crypto'?'selected':''}>Crypto</option><option value="stocks" ${trade?.market==='stocks'?'selected':''}>Stocks</option><option value="indices" ${trade?.market==='indices'?'selected':''}>Indices</option></select></div>
                        <div class="form-group"><label>Direction *</label><select class="form-control" name="direction" required><option value="long" ${trade?.direction==='long'?'selected':''}>Long</option><option value="short" ${trade?.direction==='short'?'selected':''}>Short</option></select></div>
                        <div class="form-group"><label>Entry Date *</label><input type="date" class="form-control" name="entryDate" value="${trade?.entryDate ? trade.entryDate.split('T')[0] : new Date().toISOString().split('T')[0]}" required></div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-top:1rem;">
                        <div class="form-group"><label>Entry Price *</label><input type="number" step="0.00001" class="form-control" name="entryPrice" value="${trade?.entryPrice || ''}" required></div>
                        <div class="form-group"><label>Exit Price *</label><input type="number" step="0.00001" class="form-control" name="exitPrice" value="${trade?.exitPrice || ''}" required></div>
                        <div class="form-group"><label>Stop Loss</label><input type="number" step="0.00001" class="form-control" name="stopLoss" value="${trade?.stopLoss || ''}"></div>
                        <div class="form-group"><label>Position Size</label><input type="number" step="0.01" class="form-control" name="positionSize" value="${trade?.positionSize || ''}"></div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-top:1rem;">
                        <div class="form-group"><label>Profit/Loss *</label><input type="number" step="0.01" class="form-control" name="profitLoss" value="${trade?.profitLoss || ''}" required></div>
                        <div class="form-group"><label>R Multiple</label><input type="number" step="0.01" class="form-control" name="rMultiple" value="${trade?.rMultiple || ''}"></div>
                        <div class="form-group"><label>Strategy</label><select class="form-control" name="strategy"><option value="">None</option>${stratOptions}</select></div>
                        <div class="form-group"><label>Session</label><select class="form-control" name="session"><option value="">None</option><option value="Asian" ${trade?.session==='Asian'?'selected':''}>Asian</option><option value="London" ${trade?.session==='London'?'selected':''}>London</option><option value="New York" ${trade?.session==='New York'?'selected':''}>New York</option></select></div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-top:1rem;">
                        <div class="form-group"><label>Emotion Before</label><input type="text" class="form-control" name="emotionBefore" value="${trade?.emotionBefore || ''}" placeholder="Calm, FOMO, Confident..."></div>
                        <div class="form-group"><label>Discipline (1-10)</label><input type="number" min="1" max="10" class="form-control" name="discipline" value="${trade?.discipline || ''}"></div>
                        <div class="form-group"><label>Confidence (1-10)</label><input type="number" min="1" max="10" class="form-control" name="confidence" value="${trade?.confidence || ''}"></div>
                    </div>
                    <div class="form-group" style="margin-top:1rem;"><label>Notes</label><textarea class="form-control" name="notes" rows="3">${trade?.notes || ''}</textarea></div>
                    
                    <div class="form-group" style="margin-top:1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        <label>Chart Screenshot</label>
                        <input type="file" class="form-control" id="screenshotInput" accept="image/*">
                        ${trade?.screenshot ? `<div class="trade-screenshot-container"><img src="${trade.screenshot}" alt="Current Screenshot"></div>` : ''}
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                <button class="btn btn-primary" id="saveTradeBtn">Save Trade</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        overlay.classList.add('active');

        document.getElementById('saveTradeBtn').onclick = async () => {
            const form = document.getElementById('tradeForm');
            if (!form.checkValidity()) { form.reportValidity(); return; }
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.profitLoss = parseFloat(data.profitLoss);
            data.entryPrice = parseFloat(data.entryPrice);
            data.exitPrice = parseFloat(data.exitPrice);
            if (data.stopLoss) data.stopLoss = parseFloat(data.stopLoss);
            if (data.positionSize) data.positionSize = parseFloat(data.positionSize);
            if (data.rMultiple) data.rMultiple = parseFloat(data.rMultiple);
            if (data.discipline) data.discipline = parseInt(data.discipline);
            if (data.confidence) data.confidence = parseInt(data.confidence);

            const fileInput = document.getElementById('screenshotInput');
            
            const saveToDatabase = async (finalData) => {
                try {
                    if (tradeId) {
                        finalData.id = tradeId;
                        await db.updateTrade(finalData);
                        showToast('Trade updated successfully!');
                    } else {
                        await db.addTrade(finalData);
                        showToast('Trade added successfully!');
                    }
                    app.closeModal();
                    this.loadTrades();
                    dashboard.loadDashboard();
                } catch (e) {
                    showToast('Error saving trade', 'error');
                }
           
