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
     * @returns {Promise<boolean>} - Returns true if new data was fetched, false otherwise.
     */
    getMoarData(): Promise<boolean>;
}
