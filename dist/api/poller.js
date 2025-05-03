"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMoarData = exports.MOAR_DATA_PREFIX = exports.GET_MOAR_DATA = void 0;
/*
 * Background polling to try to get more user data for the scoring algorithm
 * after things have died down from the intitial load.
 */
const async_mutex_1 = require("async-mutex");
const api_1 = __importDefault(require("../api/api"));
const Storage_1 = __importDefault(require("../Storage"));
const time_helpers_1 = require("../helpers/time_helpers");
exports.GET_MOAR_DATA = "getMoarData()";
exports.MOAR_DATA_PREFIX = `[${exports.GET_MOAR_DATA}]`;
const MOAR_MUTEX = new async_mutex_1.Mutex();
// Get morar historical data. Returns false if we have enough data and should
// stop polling.
// TODO: Add followed accounts?  for people who follow a lot?
async function getMoarData() {
    console.log(`${exports.MOAR_DATA_PREFIX} triggered by timer...`);
    const maxRecordsForFeatureScoring = Storage_1.default.getConfig().maxRecordsForFeatureScoring;
    const startedAt = new Date();
    const releaseMutex = await MOAR_MUTEX.acquire();
    const pollers = [
        api_1.default.instance.getRecentNotifications.bind(api_1.default.instance),
        api_1.default.instance.getUserRecentToots.bind(api_1.default.instance),
        // TODO: getRecentFavourites API doesn't use maxId argument BUT you can page as far back as you want
        // MastoApi.instance.getRecentFavourites.bind(MastoApi.instance),
    ];
    try {
        // Call without moar boolean to check how big the cache is
        let cacheSizes = await Promise.all(pollers.map(async (poll) => (await poll())?.length || 0));
        // Launch with moar flag those that are insufficient
        const newRecordCounts = await Promise.all(cacheSizes.map(async (size, i) => {
            if (size >= maxRecordsForFeatureScoring) {
                console.log(`${exports.MOAR_DATA_PREFIX} ${pollers[i].name} has enough records (${size})`);
                return 0;
            }
            ;
            const newRecords = await pollers[i](true); // Launch the puller with moar=true
            const newCount = (newRecords?.length || 0);
            const extraCount = newCount - cacheSizes[i];
            let msg = `${exports.MOAR_DATA_PREFIX} ${pollers[i].name} oldCount=${cacheSizes[i]}`;
            msg += `, newCount=${newCount}, extraCount=${extraCount}`;
            extraCount < 0 ? console.warn(msg) : console.log(msg);
            return extraCount || 0;
        }));
        console.log(`${exports.MOAR_DATA_PREFIX} finished ${(0, time_helpers_1.inSeconds)(startedAt)}`);
        if (newRecordCounts.every((x) => x <= 0)) {
            console.log(`${exports.MOAR_DATA_PREFIX} all ${pollers.length} pollers have enough data`);
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