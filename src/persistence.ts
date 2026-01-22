export interface StorageProvider {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
}

export class LocalStorageProvider implements StorageProvider {
    getItem(key: string) { return localStorage.getItem(key); }
    setItem(key: string, value: string) { localStorage.setItem(key, value); }
    removeItem(key: string) { localStorage.removeItem(key); }
}

export const storage = new LocalStorageProvider();
