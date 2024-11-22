"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * This file is responsible for fetching the array of StatusType objects that make up
 * the home timeline feed of a user (AKA "what most people see first upon opening Mastodon").
 */
const Storage_1 = __importDefault(require("../Storage"));
const MAX_PAGES = 10;
const MAX_TIMELINE_HOURS = 24;
const TIMELINE_LOOKBACK_MS = MAX_TIMELINE_HOURS * 60 * 60 * 1000;
async function getHomeFeed(api, _user) {
    let pagesRetrieved = 0;
    let results = [];
    // Don't load posts more than MAX_TIMELINE_HOURS old.
    const lastOpened = new Date((await Storage_1.default.getLastOpened() ?? 0) - 600);
    const cutoffTimelineAt = new Date(Date.now() - TIMELINE_LOOKBACK_MS);
    const timelineCutoff = lastOpened < cutoffTimelineAt ? cutoffTimelineAt : lastOpened;
    console.log("timelineCutoff: ", timelineCutoff);
    for await (const page of api.v1.timelines.home.list()) {
        results = results.concat(page);
        pagesRetrieved++;
        console.log(`ulled page ${pagesRetrieved} of home feed w/${page.length} toots...`);
        // break if we've pulled MAX_PAGES pages status is older than MAX_TIMELINE_HOURS old
        if (pagesRetrieved == MAX_PAGES || new Date(page[0].createdAt) < timelineCutoff) {
            console.log(`Breaking out of getHomeFeed loop after ${pagesRetrieved} pages`);
            break;
        }
    }
    return results;
}
exports.default = getHomeFeed;
;
