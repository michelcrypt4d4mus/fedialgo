"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = require("../objects/toot");
async function getHomeFeed(api, numToots, maxId) {
    const timelineLookBackMS = Storage_1.default.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
    const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
    numToots ||= Storage_1.default.getConfig().maxTimelineTootsToFetch;
    console.log(`gethomeFeed(${numToots} toots, maxId: ${maxId}), cutoffTimelineAt:`, cutoffTimelineAt);
    let toots = [];
    let pageNumber = 0;
    const timelineParams = { limit: Storage_1.default.getConfig().defaultRecordsPerPage };
    if (maxId) {
        timelineParams.max_id = maxId;
    }
    ;
    console.log(`getHomeFeed() timelineParams:`, timelineParams);
    // Sometimes there are weird outliers in the feed, like a toot that happened a few days ago.
    // Seems like these might be coming from federated apps other than Mastodon?
    // example: https://flipboard.com/users/AxiosNews/statuses/LxBgpIAhTnO1TEZ-uG2T2Q:a:2150299410
    // TODO: we should probably detect these outliers and exclude them from the cutoff time calculation
    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list(timelineParams)) {
        const pageToots = page;
        pageNumber++;
        toots = (0, toot_1.sortByCreatedAt)(toots.concat(pageToots));
        let oldestTootAt = (0, toot_1.earliestTootAt)(toots) || new Date();
        let msg = `getHomeFeed() page ${pageNumber} (${pageToots.length} toots, `;
        msg += `oldest in page: ${(0, toot_1.earliestTootAt)(pageToots)}, oldest: ${oldestTootAt})`;
        oldestTootAt ||= new Date();
        console.log(msg);
        // break if we've pulled maxTimelineTootsToFetch toots or if we've reached the cutoff date
        if ((toots.length >= numToots) || (oldestTootAt < cutoffTimelineAt)) {
            if (oldestTootAt < cutoffTimelineAt) {
                console.log(`Halting getHomeFeed() after ${pageNumber} pages bc oldestTootAt='${oldestTootAt}'`);
            }
            break;
        }
    }
    console.debug(`getHomeFeed() found ${toots.length} toots (oldest: '${(0, toot_1.earliestTootAt)(toots)}'):`, toots);
    console.debug(toots.map(toot_1.describeToot).join("\n"));
    return toots;
}
exports.default = getHomeFeed;
;
//# sourceMappingURL=homeFeed.js.map