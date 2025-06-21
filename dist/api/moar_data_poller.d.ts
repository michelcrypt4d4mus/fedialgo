export default class MoarDataPoller {
    private logger;
    private dataPoller?;
    start(): void;
    /**
     * Stop the pollers. Returns true if there was anything to stop.
     * @param {boolean} [shoulCancelInProgress=false] - If true, will cancel any in-progress data fetches.
     * @returns {boolean}
     */
    stop(): boolean;
    /**
     * Polls the Mastodon API for more data to assist in scoring the feed.
     * @returns {Promise<boolean>} - Returns true if new data was fetched, false otherwise.
     */
    getMoarData(): Promise<boolean>;
}
