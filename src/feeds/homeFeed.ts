/*
 * This file is responsible for fetching the array of Toot objects that make up
 * the home timeline feed of a user (AKA "what most people see first upon opening Mastodon").
 */
import { mastodon } from "masto";

import Storage from "../Storage";
import { Toot } from "../types";

const MAX_PAGES = 8;
const MAX_TIMELINE_HOURS = 72;
const NUM_TOOTS_PER_PAGE = 40;  // Max is 40: https://docs.joinmastodon.org/methods/timelines/#request-2
const TIMELINE_LOOKBACK_MS = MAX_TIMELINE_HOURS * 60 * 60 * 1000;
const LAST_OPENED_LOOKBACK_MS = 60 * 1000;  // Lookback an extra minute beyond last opened time just in case


export default async function getHomeFeed(
    api: mastodon.rest.Client,
    _user: mastodon.v1.Account
): Promise<Toot[]> {
    let pagesRetrieved = 0;
    let toots: Toot[] = [];

    // We should already have toots cached up until the last time this app was opened so we
    // don't need to re-retrieve them but in any case never load toots more than MAX_TIMELINE_HOURS old.
    const lastOpenedAt = new Date((await Storage.getLastOpenedTimestamp() ?? 0) - LAST_OPENED_LOOKBACK_MS);
    const cutoffTimelineAt = new Date(Date.now() - TIMELINE_LOOKBACK_MS);
    const timelineCutoff = lastOpenedAt < cutoffTimelineAt ? cutoffTimelineAt : lastOpenedAt;
    console.log("timelineCutoff: ", timelineCutoff);

    // TODO: this didn't quite work with mastodonFetchPages() but it probably could
    for await (const page of api.v1.timelines.home.list({ limit: NUM_TOOTS_PER_PAGE })) {
        toots = toots.concat(page as Toot[]);
        console.log(`Retrieved page ${++pagesRetrieved} of home feed with ${page.length} toots...`);
        const oldestTootAt = new Date(page[0].createdAt);  // TODO: are we sure this is the oldest toot in the page?

        // break if we've pulled MAX_PAGES pages status is older than MAX_TIMELINE_HOURS old
        if (pagesRetrieved == MAX_PAGES || oldestTootAt < timelineCutoff) {
            if (oldestTootAt < timelineCutoff) {
                console.log(`Halting getHomeFeed() after ${pagesRetrieved} pages bc oldestTootAt='${oldestTootAt}'`);
                toots.forEach((toot, i) => console.log(`timeline toot #${i} was tooted at ${toot.createdAt}`));
            }

            break;
        }
    }

    return toots;
};
