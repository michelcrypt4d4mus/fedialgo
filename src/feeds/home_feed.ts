/*
 * This file is responsible for fetching the array of Toot objects that make up
 * the home timeline feed of a user (AKA "what most people see first upon opening
 * Mastodon").
 */
import { mastodon } from "masto";

import Storage from "../Storage";
import Toot, { earliestTootAt, sortByCreatedAt } from '../api/objects/toot';
import { MastoApi } from "../api/api";


export default async function getHomeFeed(
    api: mastodon.rest.Client,
    numToots?: number,
    maxId?: string | number
): Promise<Toot[]> {
    numToots ||= Storage.getConfig().maxTimelineTootsToFetch;
    const timelineLookBackMS = Storage.getConfig().maxTimelineHoursToFetch * 3600 * 1000;
    const cutoffTimelineAt = new Date(Date.now() - timelineLookBackMS);
    const params = MastoApi.buildParams(maxId);
    console.log(`gethomeFeed(${numToots} toots, maxId: ${maxId}), cutoff: ${cutoffTimelineAt}, params:`, params);
    let statuses: mastodon.v1.Status[] = [];
    let pageNumber = 0;

    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list(params)) {
        const pageToots = page as mastodon.v1.Status[];
        statuses = sortByCreatedAt(statuses.concat(pageToots));
        let oldestTootAt = earliestTootAt(statuses) || new Date();
        pageNumber++;

        let msg = `getHomeFeed() page ${pageNumber} (${pageToots.length} toots, `;
        msg += `oldest in page: ${earliestTootAt(pageToots)}, oldest: ${oldestTootAt})`;
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

    const toots = statuses.map((status) => new Toot(status));
    console.debug(`getHomeFeed() found ${toots.length} toots (oldest: '${earliestTootAt(statuses)}'):`, toots);
    console.debug(toots.map(t => t.describe()).join("\n"));
    return toots;
};
