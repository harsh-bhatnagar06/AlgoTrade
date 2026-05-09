const path = require('path');
let Database;
try {
    Database = require('better-sqlite3');
} catch (e) {
    console.warn("WARNING: better-sqlite3 could not be loaded. Database features will be disabled.");
}

const dbPath = path.join(__dirname, 'algoforge_memory.db');
let dbInstance = null;
let useMock = false;

if (Database) {
    try {
        dbInstance = new Database(dbPath);
        console.log("Connected to SQLite database.");
    } catch (e) {
        console.error("Failed to connect to database:", e);
        useMock = true;
    }
} else {
    useMock = true;
}

module.exports = {
    db: dbInstance,
    useMock: useMock,
    prepare: (sql) => {
        if (useMock) {
            return {
                run: () => ({ lastInsertRowid: Date.now() }),
                get: () => null,
                all: () => []
            };
        }
        return dbInstance.prepare(sql);
    },
    exec: (sql) => {
        if (useMock) return;
        return dbInstance.exec(sql);
    }
};
