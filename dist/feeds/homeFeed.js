"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = __importDefault(require("../Storage"));
async function getHomeFeed(api) {
    const timelineLookBackMS = Storage_1.default.getConfig().maxTimelineHoursToFetch * 60 * 60 * 1000;
    let toots = [];
    let pageNumber = 0;
    const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
    console.log("gethomeFeed() cutoffTimelineAt: ", cutoffTimelineAt);
    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list({ limit: Storage_1.default.getConfig().defaultRecordsPerPage })) {
        toots = toots.concat(page);
        console.log(`Retrieved page ${++pageNumber} of home feed with ${page.length} toots...`);
        const oldestTootAt = new Date(page[0].createdAt); // TODO: are we sure this is the oldest toot in the page?
        // break if we've pulled MAX_PAGES. previously also break if pages status is older than MAX_TIMELINE_HOURS old
        // if (pageNumber == MAX_PAGES) {
        if (toots.length >= Storage_1.default.getConfig().maxTimelineTootsToFetch || oldestTootAt < cutoffTimelineAt) {
            if (oldestTootAt < cutoffTimelineAt) {
                console.log(`Halting getHomeFeed() after ${pageNumber} pages bc oldestTootAt='${oldestTootAt}'`);
            }
            break;
        }
    }
    console.debug(`getHomeFeed() returning ${toots.length} toots...`);
    return toots;
}
exports.default = getHomeFeed;
;
//# sourceMappingURL=homeFeed.js.map