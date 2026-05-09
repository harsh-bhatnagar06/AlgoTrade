/**
 * AlgoForge Structured Logger
 * Provides consistent logging across all layers.
 */
class Logger {
    constructor(component) {
        this.component = component;
    }

    info(msg, data = {}) {
        this.log('INFO', msg, data);
    }

    warn(msg, data = {}) {
        this.log('WARN', msg, data);
    }

    error(msg, data = {}) {
        this.log('ERROR', msg, data);
        window.eventBus.emit(window.EVENTS.SYSTEM_STATUS, { level: 'error', component: this.component, message: msg });
    }

    debug(msg, data = {}) {
        this.log('DEBUG', msg, data);
    }

    log(level, msg, data) {
        const timestamp = new Date().toISOString();
        const output = `[${timestamp}] [${level}] [${this.component}] ${msg}`;
        
        if (level === 'ERROR') {
            console.error(output, data);
        } else if (level === 'WARN') {
            console.warn(output, data);
        } else {
            console.log(output, data);
        }

        // Potential to send to backend for persistent logging
    }
}

if (typeof module !== 'undefined') {
    module.exports = Logger;
} else {
    window.Logger = Logger;
}
