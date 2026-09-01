// ============ TradeVault Data Layer (Supabase, per-account) ============
// Same public API as before — all modules keep working unchanged.

const T_MAP = {
    entryDate: 'entry_date', entryPrice: 'entry_price', exitPrice: 'exit_price',
    stopLoss: 'stop_loss', positionSize: 'position_size', profitLoss: 'profit_loss',
    rMultiple: 'r_multiple', emotionBefore: 'emotion_before', screenshot: 'screenshot_url'
};

function _toSnake(obj, map) {
    const o = {};
    for (const k in obj) {
        if (obj[k] === undefined) continue;
        o[map && map[k] ? map[k] : k] = obj[k];
    }
    return o;
}
function _toCamel(row, map) {
    const o = Object.assign({}, row);
    for (const c in map) { if (row[map[c]] !== undefined) o[c] = row[map[c]]; }
    return o;
}

let _uid = null;
async function tvUid() {
    if (_uid) return _uid;
    if (!window.tvClient) return null;
    const { data } = await tvClient.auth.getSession();
    _uid = data.session ? data.session.user.id : null;
    return _uid;
}
function tvActiveId() { return localStorage.getItem('tv_active_account_id'); }

async function _resizeDataUrl(dataUrl, max) {
    return new Promise((res) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            res(c.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => res(dataUrl);
        img.src = dataUrl;
    });
}

class Database {
    async init() { await tvUid(); return true; }

    // ---------- TRADES ----------
    async getAllTrades() {
        const uid = await tvUid(); const acc = tvActiveId();
        if (!uid || !acc || !window.tvClient) return [];
        const { data } = await tvClient.from('trades').select('*')
            .eq('user_id', uid).eq('account_id', acc)
            .order('entry_date', { ascending: true });
        return (data || []).map(r => _toCamel(r, T_MAP));
    }
    async getTrade(id) {
        const uid = await tvUid();
        if (!uid) return null;
        const { data } = await tvClient.from('trades').select('*').eq('id', id).eq('user_id', uid).single();
        return data ? _toCamel(data, T_MAP) : null;
    }
    async addTrade(trade) {
        const uid = await tvUid(); const acc = tvActiveId();
        if (!uid || !acc) throw new Error('No account selected');
        const row = _toSnake(trade, T_MAP);
        if (row.screenshot_url && row.screenshot_url.startsWith('data:')) {
            row.screenshot_url = await _resizeDataUrl(row.screenshot_url, 1280);
        }
        delete row.id;
        row.user_id = uid; row.account_id = acc;
        const { error } = await tvClient.from('trades').insert(row);
        if (error) throw error;
        return true;
    }
    async updateTrade(trade) {
        const uid = await tvUid();
        const row = _toSnake(trade, T_MAP);
        if (row.screenshot_url && row.screenshot_url.startsWith('data:')) {
            row.screenshot_url = await _resizeDataUrl(row.screenshot_url, 1280);
        }
        const id = row.id; delete row.id; delete row.user_id; delete row.account_id;
        const { error } = await tvClient.from('trades').update(row).eq('id', id).eq('user_id', uid);
        if (error) throw error;
        return true;
    }
    async deleteTrade(id) {
        const uid = await tvUid();
        const { error } = await tvClient.from('trades').delete().eq('id', id).eq('user_id', uid);
        if (error) throw error;
    }

    // ---------- STRATEGIES ----------
    async getAllStrategies() {
        const uid = await tvUid(); const acc = tvActiveId();
        if (!uid || !acc) return [];
        const { data } = await tvClient.from('strategies').select('*')
            .eq('user_id', uid).eq('account_id', acc).order('created_at');
        return data || [];
    }
    async addStrategy(s) {
        const uid = await tvUid(); const acc = tvActiveId();
        const { error } = await tvClient.from('strategies').insert({ user_id: uid, account_id: acc, name: s.name, description: s.description || '' });
        if (error) throw error;
    }
    async updateStrategy(s) {
        const uid = await tvUid();
        const { error } = await tvClient.from('strategies').update({ name: s.name, description: s.description }).eq('id', s.id).eq('user_id', uid);
        if (error) throw error;
    }
    async deleteStrategy(id) {
        const uid = await tvUid();
        const { error } = await tvClient.from('strategies').delete().eq('id', id).eq('user_id', uid);
        if (error) throw error;
    }

    // ---------- REVIEWS ----------
    async getAllReviews() {
        const uid = await tvUid(); const acc = tvActiveId();
        if (!uid || !acc) return [];
        const { data } = await tvClient.from('reviews').select('*')
            .eq('user_id', uid).eq('account_id', acc).order('date', { ascending: false });
        return (data || []).map(r => Object.assign({ id: r.id, type: r.type, date: r.date }, r.content));
    }
    async addReview(review) {
        const uid = await tvUid(); const acc = tvActiveId();
        const { type, date } = review;
        const content = Object.assign({}, review);
        delete content.id; delete content.type; delete content.date; delete content.createdAt;
        const { error } = await tvClient.from('reviews').insert({ user_id: uid, account_id: acc, type, date: date || new Date().toISOString().split('T')[0], content });
        if (error) throw error;
    }
    async updateReview(review) { return this.addReview(review); }
    async deleteReview(id) {
        const uid = await tvUid();
        const { error } = await tvClient.from('reviews').delete().eq('id', id).eq('user_id', uid);
        if (error) throw error;
    }

    // ---------- GOALS ----------
    async getAllGoals() {
        const uid = await tvUid(); const acc = tvActiveId();
        if (!uid || !acc) return [];
        const { data } = await tvClient.from('goals').select('*')
            .eq('user_id', uid).eq('account_id', acc).order('created_at', { ascending: false });
        return data || [];
    }
    async addGoal(g) {
        const uid = await tvUid(); const acc = tvActiveId();
        const row = Object.assign({}, g); delete row.id;
        row.user_id = uid; row.account_id = acc;
        const { error } = await tvClient.from('goals').insert(row);
        if (error) throw error;
    }
    async updateGoal(g) {
        const uid = await tvUid();
        const row = Object.assign({}, g); const id = row.id; delete row.id; delete row.user_id; delete row.account_id;
        const { error } = await tvClient.from('goals').update(row).eq('id', id).eq('user_id', uid);
        if (error) throw error;
    }
    async deleteGoal(id) {
        const uid = await tvUid();
        const { error } = await tvClient.from('goals').delete().eq('id', id).eq('user_id', uid);
        if (error) throw error;
    }

    // ---------- SETTINGS / DATA MGMT ----------
    async clear(storeName) {
        const uid = await tvUid();
        const table = storeName === 'journal' ? 'reviews' : storeName;
        const { error } = await tvClient.from(table).delete().eq('user_id', uid);
        if (error) throw error;
    }

    async exportAllData() {
        const uid = await tvUid();
        const [trades, strategies, goals, reviews] = await Promise.all([
            tvClient.from('trades').select('*').eq('user_id', uid),
            tvClient.from('strategies').select('*').eq('user_id', uid),
            tvClient.from('goals').select('*').eq('user_id', uid),
            tvClient.from('reviews').select('*').eq('user_id', uid)
        ]);
        return {
            trades: (trades.data || []).map(r => _toCamel(r, T_MAP)),
            strategies: strategies.data || [],
            goals: goals.data || [],
            reviews: (reviews.data || []).map(r => Object.assign({ id: r.id, type: r.type, date: r.date }, r.content)),
            exportDate: new Date().toISOString(),
            version: '3.0.0'
        };
    }

    async importAllData(data) {
        await this.clear('trades'); await this.clear('strategies'); await this.clear('goals'); await this.clear('journal');
        const uid = await tvUid(); const acc = tvActiveId();
        for (const t of data.trades || []) {
            const row = _toSnake(t, T_MAP); delete row.id; row.user_id = uid; row.account_id = acc;
            await tvClient.from('trades').insert(row);
        }
        for (const s of data.strategies || []) {
            await tvClient.from('strategies').insert({ user_id: uid, account_id: acc, name: s.name, description: s.description || '' });
        }
        for (const g of data.goals || []) {
            const row = Object.assign({}, g); delete row.id; row.user_id = uid; row.account_id = acc;
            await tvClient.from('goals').insert(row);
        }
        for (const r of data.reviews || []) {
            const content = Object.assign({}, r); delete content.id; delete content.type; delete content.date;
            await tvClient.from('reviews').insert({ user_id: uid, account_id: acc, type: r.type, date: r.date, content });
        }
    }
}

const db = new Database();

// auto-load the Accounts UI module
(function () {
    ['js/accounts.js', 'js/funded.js', 'js/calendar.js', 'js/polish.js', 'js/share.js', 'js/palette.js', 'js/extra.js', 'js/momentum.js', 'js/report.js', 'js/level.js', 'js/round.js', 'js/alive.js', 'js/fix2.js', 'js/pro.js', 'js/sync.js'].forEach(src => {
        const s = document.createElement('script');
        s.src = src;
        document.body.appendChild(s);
    });
})();
