/*
 * Background polling to try to get more user data for the scoring algorithm
 * after things have died down from the intitial load.
 */
import { Mutex } from 'async-mutex';

import Storage from "../Storage";
import { inSeconds } from '../helpers/time_helpers';
import { MastoApi } from "../api/api";

const MOAR_MUTEX = new Mutex();


// Get morar historical data. Returns false if we have enough data and should
// stop polling.
// TODO: Add followed accounts?  for people who follow a lot?
export async function getMoarData(): Promise<boolean> {
    const logPrefix = `[getMoarData()]`;
    console.log(`${logPrefix} triggered by timer...`);
    const startTime = new Date();
    const maxRecordsForFeatureScoring = Storage.getConfig().maxRecordsForFeatureScoring;
    const releaseMutex = await MOAR_MUTEX.acquire();

    const pollers = [
        MastoApi.instance.getRecentNotifications.bind(MastoApi.instance),
        // MastoApi.instance.getRecentFavourites.bind(MastoApi.instance),  // Doesn't use maxId argument
        MastoApi.instance.getUserRecentToots.bind(MastoApi.instance),
    ];

    try {
        // Call without moar boolean to check how big the cache is
        let cacheSizes = await Promise.all(pollers.map(async (poll) => (await poll())?.length || 0));

        // Launch with moar flag those that are insufficient
        const newRecordCounts = await Promise.all(
            cacheSizes.map(async (size, i) => {
                if (size >= maxRecordsForFeatureScoring) {
                    console.log(`${logPrefix} ${pollers[i].name} has enough records (${size})`);
                    return 0;
                };

                // Launch the puller with moar=true
                const newRecords = await pollers[i](true);
                const newCount = (newRecords?.length || 0);
                const extraCount = newCount - cacheSizes[i];
                let msg = `${logPrefix} ${pollers[i].name} oldCount=${cacheSizes[i]}`;
                msg += `, newCount=${newCount}, extraCount=${extraCount}`;
                extraCount < 0 ? console.warn(msg) : console.log(msg);
                return extraCount || 0;
            })
        );

        console.log(`${logPrefix} finished ${inSeconds(startTime)}`);

        if (newRecordCounts.every((x) => x <= 0)) {
            console.log(`${logPrefix} all pollers have enough data so calling clearInterval()`);
            return false;
        } else {
            return true;
        }
    } finally {
        releaseMutex();
    }
}
