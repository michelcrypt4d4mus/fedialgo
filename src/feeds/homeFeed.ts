/*
 * This file is responsible for fetching the array of Toot objects that make up
 * the home timeline feed of a user (AKA "what most people see first upon opening
 * Mastodon").
 */
import { mastodon } from "masto";

import Storage from "../Storage";
import { earliestTootAt } from "../objects/toot";
import { Toot } from "../types";


export default async function getHomeFeed(api: mastodon.rest.Client): Promise<Toot[]> {
    const timelineLookBackMS = Storage.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
    const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
    console.log("gethomeFeed() cutoffTimelineAt: ", cutoffTimelineAt);
    let toots: Toot[] = [];
    let pageNumber = 0;

    // Sometimes there are weird outliers in the feed, like a toot that happened a few days ago.
    // Seems like these might be coming from federated apps other than Mastodon?
    // example: https://flipboard.com/users/AxiosNews/statuses/LxBgpIAhTnO1TEZ-uG2T2Q:a:2150299410
    // TODO: we should probably detect these outliers and toos them out of the cutoff time calculation
    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list({ limit: Storage.getConfig().defaultRecordsPerPage })) {
        const pageToots = page as Toot[];
        toots = toots.concat(pageToots);
        pageNumber++;

        const oldestPageTootAt = earliestTootAt(pageToots) || new Date();
        const oldestTootAt = earliestTootAt(toots) || new Date();
        let msg = `getHomeFeed() page ${pageNumber} `;
        msg += `(${pageToots.length} toots, earliest in page: ${oldestPageTootAt}, earliest: ${oldestTootAt})`;
        console.log(msg);

        // break if we've pulled maxTimelineTootsToFetch toots or if we've reached the cutoff date
        if ((toots.length >= Storage.getConfig().maxTimelineTootsToFetch) || (oldestTootAt < cutoffTimelineAt)) {
            if (oldestTootAt < cutoffTimelineAt) {
                console.log(`Halting getHomeFeed() after ${pageNumber} pages bc oldestTootAt='${oldestTootAt}'`);
            }

            break;
        }
    }

    console.debug(`getHomeFeed() found ${toots.length} toots (oldest: '${earliestTootAt(toots)}'):`, toots);
    return toots;
};
