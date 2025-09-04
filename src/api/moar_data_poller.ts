/*
 * Background polling to try to get more user data for the scoring algorithm
 * after things have died down from the intitial load.
 */
import { Mutex } from 'async-mutex';

import MastoApi, { type ApiParams } from "../api/api";
import ScorerCache from '../scorer/scorer_cache';
import { ageString } from '../helpers/time_helpers';
import { config } from "../config";
import { lockExecution } from '../helpers/mutex_helpers';
import { Logger } from '../helpers/logger';
import { SECONDS_IN_MINUTE } from "../enums";
import { type ApiObj } from '../types';

type Poller = (params?: ApiParams) => Promise<ApiObj[]>;

const MOAR_MUTEX = new Mutex();


// TODO: Rename to UserDataPoller
export default class MoarDataPoller {
    private intervalRunner?: ReturnType<typeof setInterval>;
    private logger = new Logger('MoarDataPoller');

    start(): void {
        if (this.intervalRunner) {
            this.logger.trace(`Data poller already exists, not starting another one`);
            return;
        }

        this.logger.info(`Starting data poller on ${config.api.backgroundLoadIntervalMinutes} minute interval...`);

        this.intervalRunner = setInterval(
            async () => {
                const shouldContinue = await this.getMoarData();
                await ScorerCache.prepareScorers(true);  // Update Scorers but don't rescore feed to avoid shuffling feed

                if (!shouldContinue) {
                    this.logger.info(`Finishing up data poller (shouldContinue=${shouldContinue})`);
                    this.intervalRunner && clearInterval(this.intervalRunner!);
                }
            },
            config.api.backgroundLoadIntervalMinutes * SECONDS_IN_MINUTE * 1000
        );
    }

    /**
     * Stop the pollers. Returns true if there was anything to stop.
     * @returns {boolean}
     */
    stop(): boolean {
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
    async getMoarData(): Promise<boolean> {
        this.logger.log(`Triggered by timer...`);
        const releaseMutex = await lockExecution(MOAR_MUTEX, this.logger);
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
                        this.logger.log(`${pollers[i].name} has enough records (${size})`);
                        return 0;
                    };

                    const newRecords = await pollers[i]({moar: true});  // Launch the puller with moar=true
                    const newCount = newRecords?.length || 0;
                    const extraCount = newCount - cacheSizes[i];
                    const logObj = { extraCount, newCount, oldCount: cacheSizes[i] };
                    this.logger.logStringifiedProps(pollers[i].name, logObj);
                    return extraCount || 0;
                })
            );

            this.logger.log(`Finished ${ageString(startedAt)}`);

            if (newRecordCounts.every((x) => x <= 0)) {
                this.logger.log(`All ${pollers.length} pollers have enough data`);
                return false;
            } else {
                return true;
            }
        } finally {
            releaseMutex();
        }
    }
}
