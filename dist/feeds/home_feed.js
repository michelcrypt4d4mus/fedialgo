"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Storage_1 = __importDefault(require("../Storage"));
const toot_1 = __importStar(require("../api/objects/toot"));
const api_1 = require("../api/api");
async function getHomeFeed(api, numToots, maxId) {
    numToots ||= Storage_1.default.getConfig().maxTimelineTootsToFetch;
    const timelineLookBackMS = Storage_1.default.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
    const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
    const params = api_1.MastoApi.buildParams(maxId);
    console.log(`gethomeFeed(${numToots} toots, maxId: ${maxId}), cutoff: ${cutoffTimelineAt}, params:`, params);
    let statuses = [];
    let pageNumber = 0;
    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list(params)) {
        const pageToots = page;
        statuses = (0, toot_1.sortByCreatedAt)(statuses.concat(pageToots));
        let oldestTootAt = (0, toot_1.earliestTootAt)(statuses) || new Date();
        pageNumber++;
        let msg = `getHomeFeed() page ${pageNumber} (${pageToots.length} toots, `;
        msg += `oldest in page: ${(0, toot_1.earliestTootAt)(pageToots)}, oldest: ${oldestTootAt})`;
        oldestTootAt ||= new Date();
        console.log(msg);
        // break if we've pulled maxTimelineTootsToFetch toots or if we've reached the cutoff date
        if ((statuses.length >= numToots) || (oldestTootAt < cutoffTimelineAt)) {
            if (oldestTootAt < cutoffTimelineAt) {
                console.log(`Halting getHomeFeed() after ${pageNumber} pages bc oldestTootAt='${oldestTootAt}'`);
            }
            break;
        }
    }
    const toots = statuses.map((status) => new toot_1.default(status));
    console.debug(`getHomeFeed() found ${toots.length} toots (oldest: '${(0, toot_1.earliestTootAt)(statuses)}'):`, toots);
    console.debug(toots.map(t => t.describe()).join("\n"));
    return toots;
}
exports.default = getHomeFeed;
;
//# sourceMappingURL=home_feed.js.map