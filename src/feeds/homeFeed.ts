/*
 * This file is responsible for fetching the array of Toot objects that make up
 * the home timeline feed of a user (AKA "what most people see first upon opening
 * Mastodon").
 */
import { mastodon } from "masto";

import Storage from "../Storage";
import { Toot } from "../types";


export default async function getHomeFeed(api: mastodon.rest.Client): Promise<Toot[]> {
    const timelineLookBackMS = Storage.getConfig().maxTimelineHoursToFetch * 60 * 60 * 1000;
    let toots: Toot[] = [];
    let pageNumber = 0;
    const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
    console.log("gethomeFeed() cutoffTimelineAt: ", cutoffTimelineAt);

    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list({ limit: Storage.getConfig().defaultRecordsPerPage })) {
        toots = toots.concat(page as Toot[]);
        console.log(`Retrieved page ${++pageNumber} of home feed with ${page.length} toots...`);
        const oldestTootAt = new Date(page[0].createdAt);  // TODO: are we sure this is the oldest toot in the page?

        // break if we've pulled MAX_PAGES. previously also break if pages status is older than MAX_TIMELINE_HOURS old
        // if (pageNumber == MAX_PAGES) {
        if (toots.length >= Storage.getConfig().maxTimelineTootsToFetch || oldestTootAt < cutoffTimelineAt) {
            if (oldestTootAt < cutoffTimelineAt) {
                console.log(`Halting getHomeFeed() after ${pageNumber} pages bc oldestTootAt='${oldestTootAt}'`);
            }

            break;
        }
    }

    console.debug(`getHomeFeed() returning ${toots.length} toots...`);
    return toots;
};
