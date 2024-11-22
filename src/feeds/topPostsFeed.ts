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
    let trendingToots: StatusType[][] = [];

    // Get list of top mastodon servers // TODO: what does "top" mean here?
    const servers = Object.keys(core_servers)
                          .sort((a, b) => (core_servers[b] - core_servers[a]))  // TODO: wtf is this comparison?
                          .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)  // Remove weird records
                          .slice(0, NUM_SERVERS_TO_POLL);

    if (servers.length > 0) {
        servers.forEach(s => console.log(`Found mastodon server: `, s));
    } else {
        console.warn("No mastodon servers found to get topPostsFeed data from!");
        return [];
    }

    // Pull top trending toots from each server
    trendingToots = await Promise.all(servers.map(async (server: string): Promise<StatusType[]> => {
        const topTootsOnServer = await mastodonFetch<StatusType[]>(server, "api/v1/trends/statuses");

        if (!topTootsOnServer || topTootsOnServer.length == 0) {
            console.warn(`Failed to get trending toots from '${server}'! topTootsOnServer: `, topTootsOnServer);
            return [];
        }

        // Don't retrieve any toots that have 0 favourites or reblogs.
        // Inject a topPost property to each StatusType that is reverse-ordered
        // (e.g the most popular trending toot gets a 10, least popular is 1)
        return topTootsOnServer.filter(status => status?.favouritesCount > 0 || status?.reblogsCount > 0)
                               .map((status: StatusType, i: number) => {
                                    status.topPost = NUM_TOP_POSTS_PER_SERVER - i;
                                    return status;
                                })
                                .slice(0, NUM_TOP_POSTS_PER_SERVER);
    }))

    console.log(`topPostsFeed trendingToots:`, trendingToots);
    const lastOpened = new Date((await Storage.getLastOpened() ?? 0) - 28800000);

    return trendingToots.flat().filter((status: StatusType) => new Date(status.createdAt) > lastOpened)
                        .map((status: StatusType) => {
                            const acct = status.account.acct;
                            if (acct && !acct.includes("@")) {
                                // Inject the @server info to the account object
                                status.account.acct = `${acct}@${status.account.url.split("/")[2]}`;
                            }
                            return status;
                        });
}
