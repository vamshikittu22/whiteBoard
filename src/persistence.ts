export interface StorageProvider {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
}

// Safe localStorage wrapper that handles restricted contexts
export class LocalStorageProvider implements StorageProvider {
    private memoryStore: Map<string, string> = new Map();
    private useMemory: boolean = false;

    constructor() {
        // Test if localStorage is available
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            this.useMemory = false;
        } catch (e) {
            console.warn('[Storage] localStorage not available, using in-memory fallback');
            this.useMemory = true;
        }
    }

    getItem(key: string) {
        if (this.useMemory) {
            return this.memoryStore.get(key) || null;
        }
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return this.memoryStore.get(key) || null;
        }
    }

    setItem(key: string, value: string) {
        if (this.useMemory) {
            this.memoryStore.set(key, value);
            return;
        }
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            this.memoryStore.set(key, value);
        }
    }

    removeItem(key: string) {
        if (this.useMemory) {
            this.memoryStore.delete(key);
            return;
        }
        try {
            localStorage.removeItem(key);
        } catch (e) {
            this.memoryStore.delete(key);
        }
    }
}

export const storage = new LocalStorageProvider();
