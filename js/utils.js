// Utility Functions

// Format currency
function formatCurrency(amount, currency = 'USD') {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Format number with decimals
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) {
        return '0';
    }
    
    return num.toFixed(decimals);
}

// Format percentage
function formatPercentage(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) {
        return '0%';
    }
    
    return `${num.toFixed(decimals)}%`;
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format date and time
function formatDateTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format relative time
function formatRelativeTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return formatDate(dateString);
}

// Calculate profit/loss
function calculatePL(entryPrice, exitPrice, direction, positionSize) {
    if (!entryPrice || !exitPrice || !positionSize) return 0;
    
    const priceDiff = direction === 'long' 
        ? exitPrice - entryPrice 
        : entryPrice - exitPrice;
    
    return priceDiff * positionSize;
}

// Calculate R multiple
function calculateRMultiple(entryPrice, exitPrice, stopLoss, direction) {
    if (!entryPrice || !exitPrice || !stopLoss) return 0;
    
    const risk = Math.abs(entryPrice - stopLoss);
    if (risk === 0) return 0;
    
    const reward = direction === 'long'
        ? exitPrice - entryPrice
        : entryPrice - exitPrice;
    
    return reward / risk;
}

// Calculate win rate
function calculateWinRate(trades) {
    if (!trades || trades.length === 0) return 0;
    
    const wins = trades.filter(t => t.profitLoss > 0).length;
    return (wins / trades.length) * 100;
}

// Calculate profit factor
function calculateProfitFactor(trades) {
    if (!trades || trades.length === 0) return 0;
    
    const grossProfit = trades
        .filter(t => t.profitLoss > 0)
        .reduce((sum, t) => sum + t.profitLoss, 0);
    
    const grossLoss = Math.abs(trades
        .filter(t => t.profitLoss < 0)
        .reduce((sum, t) => sum + t.profitLoss, 0));
    
    if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
    
    return grossProfit / grossLoss;
}

// Calculate average
function calculateAverage(trades, field) {
    if (!trades || trades.length === 0) return 0;
    
    const sum = trades.reduce((acc, t) => acc + (t[field] || 0), 0);
    return sum / trades.length;
}

// Calculate sum
function calculateSum(trades, field) {
    if (!trades || trades.length === 0) return 0;
    
    return trades.reduce((sum, t) => sum + (t[field] || 0), 0);
}

// Get current streak
function getCurrentStreak(trades) {
    if (!trades || trades.length === 0) return { type: 'none', count: 0 };
    
    const sortedTrades = [...trades].sort((a, b) => 
        new Date(b.entryDate) - new Date(a.entryDate)
    );
    
    const firstResult = sortedTrades[0].profitLoss > 0 ? 'win' : 'loss';
    let count = 0;
    
    for (const trade of sortedTrades) {
        const result = trade.profitLoss > 0 ? 'win' : 'loss';
        if (result === firstResult) {
            count++;
        } else {
            break;
        }
    }
    
    return { type: firstResult, count };
}

// Calculate maximum drawdown
function calculateMaxDrawdown(trades) {
    if (!trades || trades.length === 0) return 0;
    
    const sortedTrades = [...trades].sort((a, b) => 
        new Date(a.entryDate) - new Date(b.entryDate)
    );
    
    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;
    
    for (const trade of sortedTrades) {
        runningTotal += trade.profitLoss || 0;
        peak = Math.max(peak, runningTotal);
        const drawdown = peak - runningTotal;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
}

// Generate unique ID
function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show toast notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Confirm dialog
function confirmDialog(message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('modalOverlay');
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h2>Confirm</h2>
                <button class="modal-close" id="confirmClose">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
                <button class="btn btn-danger" id="confirmOk">Confirm</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        overlay.classList.add('active');
        
        const close = (result) => {
            overlay.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
            resolve(result);
        };
        
        document.getElementById('confirmClose').onclick = () => close(false);
        document.getElementById('confirmCancel').onclick = () => close(false);
        document.getElementById('confirmOk').onclick = () => close(true);
    });
}