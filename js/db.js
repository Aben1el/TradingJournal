// IndexedDB Database Module
class Database {
    constructor() {
        this.dbName = 'EdgeJournalDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('trades')) {
                    const tradesStore = db.createObjectStore('trades', { keyPath: 'id', autoIncrement: true });
                    tradesStore.createIndex('symbol', 'symbol', { unique: false });
                    tradesStore.createIndex('strategy', 'strategy', { unique: false });
                    tradesStore.createIndex('entryDate', 'entryDate', { unique: false });
                    tradesStore.createIndex('direction', 'direction', { unique: false });
                }

                if (!db.objectStoreNames.contains('strategies')) {
                    const strategiesStore = db.createObjectStore('strategies', { keyPath: 'id', autoIncrement: true });
                    strategiesStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('journal')) {
                    const journalStore = db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
                    journalStore.createIndex('date', 'date', { unique: false });
                    journalStore.createIndex('type', 'type', { unique: false });
                }

                if (!db.objectStoreNames.contains('goals')) {
                    const goalsStore = db.createObjectStore('goals', { keyPath: 'id', autoIncrement: true });
                    goalsStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // Generic CRUD
    async add(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Trades
    async addTrade(trade) {
        trade.createdAt = new Date().toISOString();
        trade.updatedAt = new Date().toISOString();
        return await this.add('trades', trade);
    }
    async getTrade(id) { return await this.get('trades', id); }
    async getAllTrades() { return await this.getAll('trades'); }
    async updateTrade(trade) {
        trade.updatedAt = new Date().toISOString();
        return await this.update('trades', trade);
    }
    async deleteTrade(id) { return await this.delete('trades', id); }

    // Strategies
    async addStrategy(strategy) {
        strategy.createdAt = new Date().toISOString();
        return await this.add('strategies', strategy);
    }
    async getAllStrategies() { return await this.getAll('strategies'); }
    async updateStrategy(strategy) { return await this.update('strategies', strategy); }
    async deleteStrategy(id) { return await this.delete('strategies', id); }

    // Reviews (Daily / Weekly / Monthly journal entries)
    async addReview(review) {
        review.createdAt = new Date().toISOString();
        return await this.add('journal', review);
    }
    async getAllReviews() { return await this.getAll('journal'); }
    async updateReview(review) { return await this.update('journal', review); }
    async deleteReview(id) { return await this.delete('journal', id); }

    // Goals
    async addGoal(goal) {
        goal.createdAt = new Date().toISOString();
        return await this.add('goals', goal);
    }
    async getAllGoals() { return await this.getAll('goals'); }
    async updateGoal(goal) { return await this.update('goals', goal); }
    async deleteGoal(id) { return await this.delete('goals', id); }

    // Export / Import
    async exportAllData() {
        const trades = await this.getAllTrades();
        const strategies = await this.getAllStrategies();
        const goals = await this.getAllGoals();
        const reviews = await this.getAllReviews();

        return {
            trades,
            strategies,
            goals,
            reviews,
            exportDate: new Date().toISOString(),
            version: '2.0.0'
        };
    }

    async importAllData(data) {
        await this.clear('trades');
        await this.clear('strategies');
        await this.clear('goals');
        await this.clear('journal');

        for (const trade of data.trades || []) await this.add('trades', trade);
        for (const strategy of data.strategies || []) await this.add('strategies', strategy);
        for (const goal of data.goals || []) await this.add('goals', goal);
        for (const review of data.reviews || []) await this.add('journal', review);
    }
}

const db = new Database();
