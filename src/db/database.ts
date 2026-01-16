import Dexie, { type EntityTable } from 'dexie';

// Define the settings record type
export interface SettingsRecord {
    id: string;          // Primary key (e.g., 'api_key', 'theme')
    value: string;       // The stored value
    updatedAt: Date;     // When it was last updated
}

// Create the database class
class AppDatabase extends Dexie {
    settings!: EntityTable<SettingsRecord, 'id'>;

    constructor() {
        super('IRLSpeechDB');

        this.version(1).stores({
            settings: 'id, updatedAt'
        });
    }
}

// Create singleton instance
export const db = new AppDatabase();

// Helper functions for settings CRUD operations
export const settingsDB = {
    /**
     * Get a setting value by key
     */
    async get(key: string): Promise<string | null> {
        const record = await db.settings.get(key);
        return record?.value ?? null;
    },

    /**
     * Set a setting value
     */
    async set(key: string, value: string): Promise<void> {
        await db.settings.put({
            id: key,
            value,
            updatedAt: new Date()
        });
    },

    /**
     * Delete a setting
     */
    async delete(key: string): Promise<void> {
        await db.settings.delete(key);
    },

    /**
     * Get all settings as an object
     */
    async getAll(): Promise<Record<string, string>> {
        const records = await db.settings.toArray();
        return records.reduce((acc, record) => {
            acc[record.id] = record.value;
            return acc;
        }, {} as Record<string, string>);
    }
};

// Specific API key helpers
export const apiKeyDB = {
    async get(): Promise<string | null> {
        return settingsDB.get('api_key');
    },

    async set(apiKey: string): Promise<void> {
        return settingsDB.set('api_key', apiKey);
    },

    async delete(): Promise<void> {
        return settingsDB.delete('api_key');
    }
};
