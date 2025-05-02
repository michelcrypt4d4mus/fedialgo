"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMoarData = void 0;
/*
 * Background polling to try to get more user data for the scoring algorithm
 * after things have died down from the intitial load.
 */
const async_mutex_1 = require("async-mutex");
const Storage_1 = __importDefault(require("../Storage"));
const time_helpers_1 = require("../helpers/time_helpers");
const api_1 = require("../api/api");
const MOAR_MUTEX = new async_mutex_1.Mutex();
// Get morar historical data. Returns false if we have enough data and should
// stop polling.
// TODO: Add followed accounts?  for people who follow a lot?
async function getMoarData() {
    const logPrefix = `[getMoarData()]`;
    console.log(`${logPrefix} triggered by timer...`);
    const startTime = new Date();
    const maxRecordsForFeatureScoring = Storage_1.default.getConfig().maxRecordsForFeatureScoring;
    const releaseMutex = await MOAR_MUTEX.acquire();
    const pollers = [
        api_1.MastoApi.instance.getRecentNotifications.bind(api_1.MastoApi.instance),
        // MastoApi.instance.getRecentFavourites.bind(MastoApi.instance),  // Doesn't use maxId argument
        api_1.MastoApi.instance.getUserRecentToots.bind(api_1.MastoApi.instance),
    ];
    try {
        // Call without moar boolean to check how big the cache is
        let cacheSizes = await Promise.all(pollers.map(async (poll) => (await poll())?.length || 0));
        // Launch with moar flag those that are insufficient
        const newRecordCounts = await Promise.all(cacheSizes.map(async (size, i) => {
            if (size >= maxRecordsForFeatureScoring) {
                console.log(`${logPrefix} ${pollers[i].name} has enough records (${size})`);
                return 0;
            }
            ;
            // Launch the puller with moar=true
            const newRecords = await pollers[i](true);
            const newCount = (newRecords?.length || 0);
            const extraCount = newCount - cacheSizes[i];
            let msg = `${logPrefix} ${pollers[i].name} oldCount=${cacheSizes[i]}`;
            msg += `, newCount=${newCount}, extraCount=${extraCount}`;
            extraCount < 0 ? console.warn(msg) : console.log(msg);
            return extraCount || 0;
        }));
        console.log(`${logPrefix} finished ${(0, time_helpers_1.inSeconds)(startTime)}`);
        if (newRecordCounts.every((x) => x <= 0)) {
            console.log(`${logPrefix} all pollers have enough data so calling clearInterval()`);
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
exports.getMoarData = getMoarData;
//# sourceMappingURL=poller.js.map