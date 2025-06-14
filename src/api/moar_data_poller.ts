/*
 * Background polling to try to get more user data for the scoring algorithm
 * after things have died down from the intitial load.
 */
import { Mutex } from 'async-mutex';

import MastoApi, { ApiParams } from "../api/api";
import { ageString } from '../helpers/time_helpers';
import { config } from "../config";
import { lockExecution } from '../helpers/log_helpers';
import { Logger } from '../helpers/logger';
import { type ApiObj } from '../types';

type Poller = (params?: ApiParams) => Promise<ApiObj[]>;

export const GET_MOAR_DATA = "getMoarData()";
export const MOAR_DATA_PREFIX = `[${GET_MOAR_DATA}]`;
const MOAR_MUTEX = new Mutex();

export const moarDataLogger = new Logger(GET_MOAR_DATA);


// Get morar historical data. Returns false if we have enough data and should
// stop polling.
export async function getMoarData(): Promise<boolean> {
    moarDataLogger.log(`triggered by timer...`);
    const releaseMutex = await lockExecution(MOAR_MUTEX, moarDataLogger);
    const startedAt = new Date();

    // TODO: Add followed accounts?  for people who follow > 5,000 users?
    const pollers: Poller[] = [
        // NOTE: getFavouritedToots API doesn't use maxId argument so each time is a full repull
        MastoApi.instance.getFavouritedToots.bind(MastoApi.instance),
        MastoApi.instance.getNotifications.bind(MastoApi.instance),
        MastoApi.instance.getRecentUserToots.bind(MastoApi.instance),
    ];

    try {
        // Call without moar boolean to check how big the cache is
        const cacheSizes = await Promise.all(pollers.map(async (poll) => (await poll())?.length || 0));

        // Launch with moar flag those that are insufficient
        const newRecordCounts = await Promise.all(
            cacheSizes.map(async (size, i) => {
                if (size >= config.api.maxRecordsForFeatureScoring) {
                    moarDataLogger.log(`${pollers[i].name} has enough records (${size})`);
                    return 0;
                };

                const newRecords = await pollers[i]({moar: true});  // Launch the puller with moar=true
                const newCount = (newRecords?.length || 0);
                const extraCount = newCount - cacheSizes[i];
                let msg = `${MOAR_DATA_PREFIX} ${pollers[i].name} oldCount=${cacheSizes[i]}`;
                msg += `, newCount=${newCount}, extraCount=${extraCount}`;
                extraCount < 0 ? console.warn(msg) : console.log(msg);
                return extraCount || 0;
            })
        );

        moarDataLogger.log(`Finished ${ageString(startedAt)}`);

        if (newRecordCounts.every((x) => x <= 0)) {
            moarDataLogger.log(`All ${pollers.length} pollers have enough data`);
            return false;
        } else {
            return true;
        }
    } finally {
        releaseMutex();
    }
}
