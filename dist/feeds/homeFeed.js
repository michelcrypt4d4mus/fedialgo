"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = __importDefault(require("../Storage"));
const api_1 = require("../api/api");
const MAX_PAGES = 12;
const MAX_TIMELINE_HOURS = 96;
const TIMELINE_LOOKBACK_MS = MAX_TIMELINE_HOURS * 60 * 60 * 1000;
const LAST_OPENED_LOOKBACK_MS = 60 * 1000; // Lookback an extra minute beyond last opened time just in case
async function getHomeFeed(api) {
    let toots = [];
    let pageNumber = 0;
    // We should already have toots cached up until the last time this app was opened so we
    // don't need to re-retrieve them but in any case never load toots more than MAX_TIMELINE_HOURS old.
    const lastOpenedAt = new Date((await Storage_1.default.getLastOpenedTimestamp() ?? 0) - LAST_OPENED_LOOKBACK_MS);
    const cutoffTimelineAt = new Date(Date.now() - TIMELINE_LOOKBACK_MS);
    const timelineCutoff = lastOpenedAt < cutoffTimelineAt ? cutoffTimelineAt : lastOpenedAt;
    // console.log("gethomeFeed() timelineCutoff: ", timelineCutoff);
    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list({ limit: api_1.DEFAULT_RECORDS_PER_PAGE })) {
        toots = toots.concat(page);
        console.log(`Retrieved page ${++pageNumber} of home feed with ${page.length} toots...`);
        const oldestTootAt = new Date(page[0].createdAt); // TODO: are we sure this is the oldest toot in the page?
        // break if we've pulled MAX_PAGES. previously also break if pages status is older than MAX_TIMELINE_HOURS old
        if (pageNumber == MAX_PAGES) {
            if (oldestTootAt < timelineCutoff) {
                console.log(`Halting getHomeFeed() after ${pageNumber} pages bc oldestTootAt='${oldestTootAt}'`);
                // toots.forEach((toot, i) => console.log(`timeline toot #${i} was tooted at ${toot.createdAt}`));
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