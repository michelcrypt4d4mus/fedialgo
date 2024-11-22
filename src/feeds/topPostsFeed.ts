/*
 * Pull top trending toots on mastodon server (servers?) including from accounts user
 * doesn't follow.
 */
import { mastodon } from "masto";

import FeatureStore from "../features/FeatureStore";
import Storage from "../Storage";
import { condensedStatus } from "../helpers";
import { mastodonFetch } from "../helpers";
import { StatusType } from "../types";

const NUM_HOURS_BEFORE_REFRESH = 8;
const NUM_MS_BEFORE_REFRESH = NUM_HOURS_BEFORE_REFRESH * 60 * 60 * 1000;
const NUM_SERVERS_TO_POLL = 10;
const NUM_TOP_POSTS_PER_SERVER = 10;


export default async function topPostsFeed(api: mastodon.rest.Client): Promise<StatusType[]> {
    const coreServers = await FeatureStore.getCoreServer(api)
    let trendingToots: StatusType[][] = [];

    // Get list of top mastodon servers // TODO: what does "top" mean here?
    const servers = Object.keys(coreServers)
                          .sort((a, b) => (coreServers[b] - coreServers[a]))  // TODO: wtf is this comparison?
                          .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)  // Remove weird records
                          .slice(0, NUM_SERVERS_TO_POLL);

    if (servers.length > 0) {
        console.log(`Found top mastodon servers: `, servers);
    } else {
        console.warn("No mastodon servers found to get topPostsFeed data from!");
        return [];
    }

    // Pull top trending toots from each server
    trendingToots = await Promise.all(servers.map(async (server: string): Promise<StatusType[]> => {
        let serverTopToots = await mastodonFetch<StatusType[]>(server, "api/v1/trends/statuses");

        if (!serverTopToots || serverTopToots.length == 0) {
            console.warn(`Failed to get trending toots from '${server}'! serverTopToots: `, serverTopToots);
            return [];
        }

        // Ignore toots that have no favourites or retoots.
        // Inject a topPost score property that is reverse-ordered, e.g most popular trending
        // toot gets NUM_TOP_POSTS_PER_SERVER points, least trending gets 1).
        serverTopToots =  serverTopToots.filter(status => status?.favouritesCount > 0 || status?.reblogsCount > 0)
                                        .slice(0, NUM_TOP_POSTS_PER_SERVER)
                                        .map((status: StatusType, i: number) => {
                                            // Inject the @server info to the account string
                                            const acct = status.account.acct;

                                            if (acct && !acct.includes("@")) {
                                                status.account.acct = `${acct}@${status.account.url.split("/")[2]}`;
                                            }

                                            status.topPost = NUM_TOP_POSTS_PER_SERVER - i;  // inject topPost score
                                            return status;
                                        });

        console.log(`topToots for server '${server}': `, serverTopToots.map(condensedStatus));
        return serverTopToots;
    }))

    const lastOpenedAt = new Date((await Storage.getLastOpened() ?? 0) - NUM_MS_BEFORE_REFRESH);
    return trendingToots.flat().filter((status: StatusType) => new Date(status.createdAt) > lastOpenedAt);
};
