"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lockExecution = void 0;
const time_helpers_1 = require("./time_helpers");
const config_1 = require("../config");
const logger_1 = require("./logger");
/**
 * Lock a Semaphore or Mutex and log the time it took to acquire the lock
 * @param {Mutex | Semaphore} locker - The lock to acquire
 * @param {Logger} [logger] - Optional logger to use; defaults to a new Logger instance
 * @returns {Promise<ConcurrencyLockRelease>} A promise that resolves to a function to release the lock
 */
async function lockExecution(locker, logger) {
    logger ||= new logger_1.Logger("lockExecution");
    logger.deep(`lockExecution called...`);
    const startedAt = new Date();
    const acquireLock = await locker.acquire();
    let releaseLock;
    let logMsg;
    if (Array.isArray(acquireLock)) {
        logMsg = `Semaphore ${acquireLock[0]}`;
        releaseLock = acquireLock[1];
    }
    else {
        logMsg = `Mutex`;
        releaseLock = acquireLock;
    }
    logMsg += ` lock acquired ${(0, time_helpers_1.ageString)(startedAt)}`;
    const waitSeconds = time_helpers_1.AgeIn.seconds(startedAt);
    if (waitSeconds > config_1.config.api.mutexWarnSeconds) {
        logger.debug(logMsg);
    }
    else if (waitSeconds > (config_1.config.api.mutexWarnSeconds / 2)) {
        logger.deep(logMsg);
    }
    return releaseLock;
}
exports.lockExecution = lockExecution;
;
//# sourceMappingURL=mutex_helpers.js.map