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

                // Create trades store
                if (!db.objectStoreNames.contains('trades')) {
                    const tradesStore = db.createObjectStore('trades', { keyPath: 'id', autoIncrement: true });
                    tradesStore.createIndex('symbol', 'symbol', { unique: false });
                    tradesStore.createIndex('strategy', 'strategy', { unique: false });
                    tradesStore.createIndex('entryDate', 'entryDate', { unique: false });
                    tradesStore.createIndex('direction', 'direction', { unique: false });
                }

                // Create strategies store
                if (!db.objectStoreNames.contains('strategies')) {
                    const strategiesStore = db.createObjectStore('strategies', { keyPath: 'id', autoIncrement: true });
                    strategiesStore.createIndex('name', 'name', { unique: false });
                }

                // Create journal store
                if (!db.objectStoreNames.contains('journal')) {
                    const journalStore = db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
                    journalStore.createIndex('date', 'date', { unique: false });
                    journalStore.createIndex('type', 'type', { unique: false });
                }

                // Create goals store
                if (!db.objectStoreNames.contains('goals')) {
                    const goalsStore = db.createObjectStore('goals', { keyPath: 'id', autoIncrement: true });
                    goalsStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // Generic CRUD operations
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

    // Trade-specific operations
    async addTrade(trade) {
        trade.createdAt = new Date().toISOString();
        trade.updatedAt = new Date().toISOString();
        return await this.add('trades', trade);
    }

    async getTrade(id) {
        return await this.get('trades', id);
    }

    async getAllTrades() {
        return await this.getAll('trades');
    }

    async updateTrade(trade) {
        trade.updatedAt = new Date().toISOString();
        return await this.update('trades', trade);
    }

    async deleteTrade(id) {
        return await this.delete('trades', id);
    }

    // Strategy-specific operations
    async addStrategy(strategy) {
        strategy.createdAt = new Date().toISOString();
        return await this.add('strategies', strategy);
    }

    async getAllStrategies() {
        return await this.getAll('strategies');
    }

    async updateStrategy(strategy) {
        return await this.update('strategies', strategy);
    }

    async deleteStrategy(id) {
        return await this.delete('strategies', id);
    }

    // Goal-specific operations
    async addGoal(goal) {
        goal.createdAt = new Date().toISOString();
        return await this.add('goals', goal);
    }

    async getAllGoals() {
        return await this.getAll('goals');
    }

    async updateGoal(goal) {
        return await this.update('goals', goal);
    }

    async deleteGoal(id) {
        return await this.delete('goals', id);
    }

    // Export all data
    async exportAllData() {
        const trades = await this.getAllTrades();
        const strategies = await this.getAllStrategies();
        const goals = await this.getAllGoals();
        
        return {
            trades,
            strategies,
            goals,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    // Import all data
    async importAllData(data) {
        // Clear existing data
        await this.clear('trades');
        await this.clear('strategies');
        await this.clear('goals');

        // Import new data
        for (const trade of data.trades || []) {
            await this.add('trades', trade);
        }
        for (const strategy of data.strategies || []) {
            await this.add('strategies', strategy);
        }
        for (const goal of data.goals || []) {
            await this.add('goals', goal);
        }
    }
}

// Create global database instance
const db = new Database();