"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Background polling to try to get more user data for the scoring algorithm
 * after things have died down from the intitial load.
 */
const async_mutex_1 = require("async-mutex");
const api_1 = __importDefault(require("../api/api"));
const scorer_cache_1 = __importDefault(require("../scorer/scorer_cache"));
const time_helpers_1 = require("../helpers/time_helpers");
const config_1 = require("../config");
const mutex_helpers_1 = require("../helpers/mutex_helpers");
const logger_1 = require("../helpers/logger");
const enums_1 = require("../enums");
const GET_MOAR_DATA = "getMoarData()";
const MOAR_MUTEX = new async_mutex_1.Mutex();
class MoarDataPoller {
    intervalRunner;
    logger = new logger_1.Logger(GET_MOAR_DATA);
    start() {
        if (this.intervalRunner) {
            this.logger.trace(`Data poller already exists, not starting another one`);
            return;
        }
        this.logger.info(`Starting data poller on ${config_1.config.api.backgroundLoadIntervalMinutes} minute interval...`);
        this.intervalRunner = setInterval(async () => {
            const shouldContinue = await this.getMoarData();
            await scorer_cache_1.default.prepareScorers(true); // Update Scorers but don't rescore feed to avoid shuffling feed
            if (!shouldContinue) {
                this.logger.log(`Stopping data poller because shouldContinue:`, shouldContinue);
                this.intervalRunner && clearInterval(this.intervalRunner);
            }
        }, config_1.config.api.backgroundLoadIntervalMinutes * enums_1.SECONDS_IN_MINUTE * 1000);
    }
    /**
     * Stop the pollers. Returns true if there was anything to stop.
     * @returns {boolean}
     */
    stop() {
        if (MOAR_MUTEX.isLocked()) {
            this.logger.log(`Cancelling in-progress data fetch...`);
            MOAR_MUTEX.cancel();
        }
        if (!this.intervalRunner) {
            this.logger.trace(`Data poller does not exist, nothing to stop...`);
            return false;
        }
        clearInterval(this.intervalRunner);
        this.intervalRunner = undefined;
        this.logger.log(`Stopped data poller.`);
        return true;
    }
    /**
     * Polls the Mastodon API for more data to assist in scoring the feed.
     * @returns {Promise<boolean>} - Returns true if new data was fetched, false otherwise.
     */
    async getMoarData() {
        this.logger.log(`Triggered by timer...`);
        const releaseMutex = await (0, mutex_helpers_1.lockExecution)(MOAR_MUTEX, this.logger);
        const startedAt = new Date();
        // TODO: Add followed accounts?  for people who follow > 5,000 users?
        const pollers = [
            // NOTE: getFavouritedToots API doesn't use maxId argument so each time is a full repull
            api_1.default.instance.getFavouritedToots.bind(api_1.default.instance),
            api_1.default.instance.getNotifications.bind(api_1.default.instance),
            api_1.default.instance.getRecentUserToots.bind(api_1.default.instance),
        ];
        try {
            // Call without moar boolean to check how big the cache is
            const cacheSizes = await Promise.all(pollers.map(async (poll) => (await poll())?.length || 0));
            // Launch with moar flag those that are insufficient
            const newRecordCounts = await Promise.all(cacheSizes.map(async (size, i) => {
                if (size >= config_1.config.api.maxRecordsForFeatureScoring) {
                    this.logger.log(`${pollers[i].name} has enough records (${size})`);
                    return 0;
                }
                ;
                const newRecords = await pollers[i]({ moar: true }); // Launch the puller with moar=true
                const newCount = newRecords?.length || 0;
                const extraCount = newCount - cacheSizes[i];
                const logObj = { extraCount, newCount, oldCount: cacheSizes[i] };
                this.logger.logStringifiedProps(pollers[i].name, logObj);
                return extraCount || 0;
            }));
            this.logger.log(`Finished ${(0, time_helpers_1.ageString)(startedAt)}`);
            if (newRecordCounts.every((x) => x <= 0)) {
                this.logger.log(`All ${pollers.length} pollers have enough data`);
                return false;
            }
            else {
                return true;
            }
        }
        finally {
            releaseMutex();
        }
    }
}
exports.default = MoarDataPoller;
//# sourceMappingURL=moar_data_poller.js.map