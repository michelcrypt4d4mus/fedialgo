/*
 * Background polling to try to get more user data for the scoring algorithm
 * after things have died down from the intitial load.
 */
import { Mutex } from 'async-mutex';

import Storage from "../Storage";
import { inSeconds } from '../helpers/time_helpers';
import { MastoApi } from "../api/api";

export const GET_MOAR_DATA = "getMoarData()";
export const MOAR_DATA_PREFIX = `[${GET_MOAR_DATA}]`;
const MOAR_MUTEX = new Mutex();


// Get morar historical data. Returns false if we have enough data and should
// stop polling.
// TODO: Add followed accounts?  for people who follow a lot?
export async function getMoarData(): Promise<boolean> {
    console.log(`${MOAR_DATA_PREFIX} triggered by timer...`);
    const maxRecordsForFeatureScoring = Storage.getConfig().maxRecordsForFeatureScoring;
    const startedAt = new Date();
    const releaseMutex = await MOAR_MUTEX.acquire();

    const pollers = [
        MastoApi.instance.getRecentNotifications.bind(MastoApi.instance),
        MastoApi.instance.getUserRecentToots.bind(MastoApi.instance),
        // TODO: getRecentFavourites API doesn't use maxId argument BUT you can page as far back as you want
        // MastoApi.instance.getRecentFavourites.bind(MastoApi.instance),
    ];

    try {
        // Call without moar boolean to check how big the cache is
        let cacheSizes = await Promise.all(pollers.map(async (poll) => (await poll())?.length || 0));

        // Launch with moar flag those that are insufficient
        const newRecordCounts = await Promise.all(
            cacheSizes.map(async (size, i) => {
                if (size >= maxRecordsForFeatureScoring) {
                    console.log(`${MOAR_DATA_PREFIX} ${pollers[i].name} has enough records (${size})`);
                    return 0;
                };

                const newRecords = await pollers[i](true);  // Launch the puller with moar=true
                const newCount = (newRecords?.length || 0);
                const extraCount = newCount - cacheSizes[i];
                let msg = `${MOAR_DATA_PREFIX} ${pollers[i].name} oldCount=${cacheSizes[i]}`;
                msg += `, newCount=${newCount}, extraCount=${extraCount}`;
                extraCount < 0 ? console.warn(msg) : console.log(msg);
                return extraCount || 0;
            })
        );

        console.log(`${MOAR_DATA_PREFIX} finished ${inSeconds(startedAt)}`);

        if (newRecordCounts.every((x) => x <= 0)) {
            console.log(`${MOAR_DATA_PREFIX} all ${pollers.length} pollers have enough data`);
            return false;
        } else {
            return true;
        }
    } finally {
        releaseMutex();
    }
}
