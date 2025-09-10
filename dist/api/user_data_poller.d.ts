/**
 * Handle Background polling to try to get more user data for the scoring algorithm
 * after things have died down from the intitial load.
 * @class
 * @property {ReturnType<typeof setInterval>|undefined} intervalRunner - The interval runner for periodic polling.
 * @property {Logger} logger - {@linkcode Logger} instance to use when polling.
 */
export default class UserDataPoller {
    private intervalRunner?;
    private logger;
    start(): void;
    /**
     * Stop the pollers. Returns true if there was anything to stop.
     * @returns {boolean}
     */
    stop(): boolean;
    /**
     * Polls the Mastodon API for more data to assist in scoring the feed.
     * @returns {Promise<boolean>} - True if new data was fetched, false otherwise.
     */
    getMoarData(): Promise<boolean>;
}
