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
    const core_servers = await FeatureStore.getCoreServer(api)
    let trendingToots: StatusType[][] = [];

    // Get list of top mastodon servers // TODO: what does "top" mean here?
    const servers = Object.keys(core_servers)
                          .sort((a, b) => (core_servers[b] - core_servers[a]))  // TODO: wtf is this comparison?
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
        let topTootsOnServer = await mastodonFetch<StatusType[]>(server, "api/v1/trends/statuses");

        if (!topTootsOnServer || topTootsOnServer.length == 0) {
            console.warn(`Failed to get trending toots from '${server}'! topTootsOnServer: `, topTootsOnServer);
            return [];
        }

        // Ignore toots that have 0 favourites or reblogs.
        // Inject a topPost property to each StatusType that is reverse-ordered
        // (e.g most popular trending toot gets a 10, least popular is 1)
        topTootsOnServer =  topTootsOnServer.filter(status => status?.favouritesCount > 0 || status?.reblogsCount > 0)
                                            .map((status: StatusType, i: number) => {
                                                status.topPost = NUM_TOP_POSTS_PER_SERVER - i;
                                                console.log(`topPostsFeed status:`, status);
                                                return status;
                                            })
                                            .slice(0, NUM_TOP_POSTS_PER_SERVER);

        console.log(`topToots for server '${server}': `, topTootsOnServer.map(condensedStatus));
        return topTootsOnServer;
    }))

    const lastOpened = new Date((await Storage.getLastOpened() ?? 0) - NUM_MS_BEFORE_REFRESH);

    return trendingToots.flat().filter((status: StatusType) => new Date(status.createdAt) > lastOpened)
                        .map((status: StatusType) => {
                            const acct = status.account.acct;
                            // TODO: this belongs in the Promise.all() above
                            if (acct && !acct.includes("@")) {
                                // Inject the @server info to the account object
                                status.account.acct = `${acct}@${status.account.url.split("/")[2]}`;
                            }
                            return status;
                        });
}
