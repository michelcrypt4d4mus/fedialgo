/*
 * Pull top trending toots on mastodon server (servers?) including from accounts user
 * doesn't follow.
 */
import { mastodon } from "masto";

import FeatureStore from "../features/FeatureStore";
import Storage from "../Storage";
import { mastodonFetch } from "../helpers";
import { StatusType } from "../types";

const NUM_HOURS_BEFORE_REFRESH = 8;
const NUM_SERVERS_TO_POLL = 10;
const NUM_TOP_POSTS_PER_SERVER = 10;


export default async function topPostsFeed(api: mastodon.rest.Client): Promise<StatusType[]> {
    const core_servers = await FeatureStore.getCoreServer(api)
    let results: StatusType[][] = [];

    // Get list of top mastodon servers // TODO: what does "top" mean here?
    const servers = Object.keys(core_servers)
                          .sort((a, b) => (core_servers[b] - core_servers[a]))  // TODO: wtf is this comparison?
                          .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)  // Remove weird records
                          .slice(0, NUM_SERVERS_TO_POLL);

    for (const s in servers) {
        console.log(`Found mastodon server: `, s);
    }

    if (servers.length === 0) {
        console.warn("No mastodon servers found to get topPostsFeed data from!");
        return [];
    }

    results = await Promise.all(servers.map(async (server: string): Promise<StatusType[]> => {
        if (server === "undefined" || typeof server == "undefined" || server === "") return [];
        const data = await mastodonFetch<StatusType[]>(server, "api/v1/trends/statuses");
        if (!data) throw new Error(`Failed to get top toots from server ${server}: ${JSON.stringify(data, null, 4)}`);

        return data.filter(status => status?.favouritesCount > 0 || status?.reblogsCount > 0)
                   .map((status: StatusType, i) => {
                        status.topPost = true;  // Add a topPost property to the status
                        return status;
                   })
                   .slice(0, NUM_TOP_POSTS_PER_SERVER) ?? [];
    }))

    console.log(`topPostsFeed results:`, results);
    const lastOpened = new Date((await Storage.getLastOpened() ?? 0) - 28800000);

    return results.flat().filter((status: StatusType) => new Date(status.createdAt) > lastOpened).map((status: StatusType) => {
        const acct = status.account.acct;
        if (acct && !acct.includes("@")) {
            status.account.acct = `${acct}@${status.account.url.split("/")[2]}`;
        }
        return status;
    })
}
