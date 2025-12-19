/**
 * @fileoverview File Logger Service
 * Handles writing logs to file system with rotation (10MB limit) and retention (7 days) policies.
 */
const fs = require('fs');
const path = require('path');

class FileLogger {
    constructor(userDataPath) {
        this.logDir = path.join(userDataPath, 'logs');
        this.currentLogFile = path.join(this.logDir, 'simulator.log');
        this.maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
        this.maxRetentionTime = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

        this.init();
    }

    init() {
        // Ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        // Run initial cleanup
        this.cleanOldLogs();
    }

    /**
     * Write a log entry to the file
     * @param {string} message - Log message
     * @param {string} type - Log type (info, error, etc.)
     * @param {Object} [data] - Optional data object stringified
     */
    write(message, type = 'info', data = null) {
        try {
            this.rotateCheck();

            const timestamp = new Date().toISOString();
            let logLine = `[${timestamp}] [${type.toUpperCase()}] ${message}`;

            if (data) {
                try {
                    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
                    logLine += ` | Data: ${dataStr}`;
                } catch (e) {
                    logLine += ` | Data: [Circular or Invalid JSON]`;
                }
            }

            logLine += '\n';

            fs.appendFileSync(this.currentLogFile, logLine, { encoding: 'utf8' });
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Check if current log file exceeds limit and rotate if necessary
     */
    rotateCheck() {
        try {
            if (fs.existsSync(this.currentLogFile)) {
                const stats = fs.statSync(this.currentLogFile);
                if (stats.size >= this.maxFileSize) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const backupPath = path.join(this.logDir, `simulator-${timestamp}.log`);
                    fs.renameSync(this.currentLogFile, backupPath);
                }
            }
        } catch (error) {
            console.error('Log rotation failed:', error);
        }
    }

    /**
     * Remove logs older than retention period
     */
    cleanOldLogs() {
        try {
            if (!fs.existsSync(this.logDir)) return;

            const files = fs.readdirSync(this.logDir);
            const now = Date.now();

            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > this.maxRetentionTime) {
                        fs.unlinkSync(filePath);
                        console.log(`[FileLogger] Deleted old log file: ${file}`);
                    }
                } catch (err) {
                    // Ignore errors for individual files (e.g. permission issues)
                }
            });
        } catch (error) {
            console.error('Log cleanup failed:', error);
        }
    }

    /**
     * Get the directory path where logs are stored
     */
    getLogDirectory() {
        return this.logDir;
    }
}

module.exports = FileLogger;
