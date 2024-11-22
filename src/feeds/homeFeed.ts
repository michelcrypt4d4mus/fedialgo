/*
 * This file is responsible for fetching the array of StatusType objects that make up
 * the home timeline feed of a user (AKA "what most people see first upon opening Mastodon").
 */
import Storage from "../Storage";
import { mastodon } from "masto";
import { StatusType } from "../types";

const MAX_PAGES = 10;
const MAX_TIMELINE_HOURS = 24;
const TIMELINE_LOOKBACK_MS = MAX_TIMELINE_HOURS * 60 * 60 * 1000;


export default async function getHomeFeed(api: mastodon.rest.Client, _user: mastodon.v1.Account): Promise<StatusType[]> {
    let pagesRetrieved = 0;
    let results: StatusType[] = [];

    // Don't load posts more than MAX_TIMELINE_HOURS old.
    const lastOpened = new Date((await Storage.getLastOpened() ?? 0) - 600);
    const cutoffTimelineAt = new Date(Date.now() - TIMELINE_LOOKBACK_MS);
    const timelineCutoff = lastOpened < cutoffTimelineAt ? cutoffTimelineAt : lastOpened;
    console.log("timelineCutoff: ", timelineCutoff);

    for await (const page of api.v1.timelines.home.list()) {
        results = results.concat(page as StatusType[]);
        pagesRetrieved++;
        console.log(`ulled page ${pagesRetrieved} of home feed w/${page.length} toots...`);

        // break if we've pulled MAX_PAGES pages status is older than MAX_TIMELINE_HOURS old
        if (pagesRetrieved == MAX_PAGES || new Date(page[0].createdAt) < timelineCutoff) {
            console.log(`Breaking out of getHomeFeed loop after ${pagesRetrieved} pages`);
            break;
        }
    }

    return results;
};
