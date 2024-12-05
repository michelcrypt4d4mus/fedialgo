"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = require("../objects/toot");
async function getHomeFeed(api) {
    const timelineLookBackMS = Storage_1.default.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
    const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
    console.log("gethomeFeed() cutoffTimelineAt: ", cutoffTimelineAt);
    let toots = [];
    let pageNumber = 0;
    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list({ limit: Storage_1.default.getConfig().defaultRecordsPerPage })) {
        toots = toots.concat(page);
        // Sometimes there are weird outliers in the feed, like a toot that happened a few days ago.
        // Seems like these might be coming from federated apps other than Mastodon?
        // example: https://flipboard.com/users/AxiosNews/statuses/LxBgpIAhTnO1TEZ-uG2T2Q:a:2150299410
        // TODO: we should probably detect these outliers and toos them out of the cutoff time calculation
        const oldestTootAt = (0, toot_1.earliestTootAt)(toots) || new Date();
        console.log(`getHomeFeed() page ${++pageNumber} (${page.length} toots, earliest: ${oldestTootAt})`);
        // break if we've pulled maxTimelineTootsToFetch toots or if we've reached the cutoff date
        if (toots.length >= Storage_1.default.getConfig().maxTimelineTootsToFetch || oldestTootAt < cutoffTimelineAt) {
            if (oldestTootAt < cutoffTimelineAt) {
                console.log(`Halting getHomeFeed() after ${pageNumber} pages bc oldestTootAt='${oldestTootAt}'`);
            }
            break;
        }
    }
    console.debug(`getHomeFeed() found ${toots.length} toots (oldest: '${(0, toot_1.earliestTootAt)(toots)}'):`, toots);
    return toots;
}
exports.default = getHomeFeed;
;
//# sourceMappingURL=homeFeed.js.map