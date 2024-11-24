"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = __importDefault(require("../Storage"));
const MAX_PAGES = 16;
const MAX_TIMELINE_HOURS = 72;
const TIMELINE_LOOKBACK_MS = MAX_TIMELINE_HOURS * 60 * 60 * 1000;
const LAST_OPENED_LOOKBACK_MS = 60 * 1000; // Lookback an extra minute beyond last opened time just in case
async function getHomeFeed(api, _user) {
    let pagesRetrieved = 0;
    let results = [];
    // We should already have toots cached up until the last time this app was opened so we
    // don't need to re-retrieve them but in any case never load toots more than MAX_TIMELINE_HOURS old.
    const lastOpened = new Date((await Storage_1.default.getLastOpened() ?? 0) - LAST_OPENED_LOOKBACK_MS);
    const cutoffTimelineAt = new Date(Date.now() - TIMELINE_LOOKBACK_MS);
    const timelineCutoff = lastOpened < cutoffTimelineAt ? cutoffTimelineAt : lastOpened;
    console.log("timelineCutoff: ", timelineCutoff);
    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list()) {
        results = results.concat(page);
        pagesRetrieved++;
        console.log(`Retrieved page ${pagesRetrieved} of home feed with ${page.length} toots...`);
        const oldestTootAt = new Date(page[0].createdAt); // TODO: are we sure this is the oldest toot in the page?
        // break if we've pulled MAX_PAGES pages status is older than MAX_TIMELINE_HOURS old
        if (pagesRetrieved == MAX_PAGES || oldestTootAt < timelineCutoff) {
            if (oldestTootAt < timelineCutoff) {
                console.log(`Breaking out of getHomeFeed() after ${pagesRetrieved} pages bc oldestTootAt='${oldestTootAt}'`);
                results.forEach((toot, i) => console.log(`timeline toot #${i} was tooted at ${toot.createdAt}`));
            }
            break;
        }
    }
    return results;
}
exports.default = getHomeFeed;
;
//# sourceMappingURL=homeFeed.js.map