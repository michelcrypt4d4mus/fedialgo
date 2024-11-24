/*
 * Pull top trending toots on mastodon server (servers?) including from accounts user
 * doesn't follow.
 */
import { mastodon } from "masto";

import FeatureStore from "../features/FeatureStore";
import Storage from "../Storage";
import { condensedStatus } from "../helpers";
import { mastodonFetch } from "../helpers";
import { Toot } from "../types";

const NUM_HOURS_BEFORE_REFRESH = 8;
const NUM_MS_BEFORE_REFRESH = NUM_HOURS_BEFORE_REFRESH * 60 * 60 * 1000;
const NUM_SERVERS_TO_POLL = 10;
const NUM_TRENDING_POSTS_PER_SERVER = 10;
const TRENDING_TOOTS_REST_PATH = "api/v1/trends/statuses";


export default async function topPostsFeed(api: mastodon.rest.Client): Promise<Toot[]> {
    const coreServers = await FeatureStore.getCoreServer(api);

    // Get list of top mastodon servers // TODO: what does "top" mean here?
    const servers = Object.keys(coreServers)
                          .sort((a, b) => (coreServers[b] - coreServers[a]))  // TODO: wtf is this comparison?
                          .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)  // Remove weird records
                          .slice(0, NUM_SERVERS_TO_POLL);

    if (servers.length == 0) {
        console.warn("No mastodon servers found to get topPostsFeed data from!");
        return [];
    }

    console.log(`Found top mastodon servers: `, servers);

    // Pull top trending toots from each server
    const trendingToots = await Promise.all(servers.map(async (server: string): Promise<Toot[]> => {
        let serverTopToots = await mastodonFetch<Toot[]>(server, TRENDING_TOOTS_REST_PATH);

        if (!serverTopToots || serverTopToots.length == 0) {
            console.warn(`Failed to get trending toots from '${server}'! serverTopToots:`, serverTopToots);
            return [];
        }

        // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
        // and inject a topPost score property that is reverse-ordered, e.g most popular trending
        // toot gets NUM_TRENDING_POSTS_PER_SERVER points, least trending gets 1).
        serverTopToots = serverTopToots.filter(toot => toot?.favouritesCount > 0 || toot?.reblogsCount > 0)
                                       .slice(0, NUM_TRENDING_POSTS_PER_SERVER)
                                       .map((toot: Toot, i: number) => {
                                            // Inject the @server info to the account string
                                            const acct = toot.account.acct;

                                            if (acct && !acct.includes("@")) {
                                                toot.account.acct = `${acct}@${toot.account.url.split("/")[2]}`;
                                            }

                                            // Inject topPost scoring // TODO: maybe should be placed in top.scores.topPost?
                                            toot.topPost = NUM_TRENDING_POSTS_PER_SERVER - i;
                                            return toot;
                                       });

        console.log(`topToots for server '${server}': `, serverTopToots.map(condensedStatus));
        return serverTopToots;
    }));

    const lastOpenedAt = new Date((await Storage.getLastOpenedTimestamp() ?? 0) - NUM_MS_BEFORE_REFRESH);
    return trendingToots.flat().filter((toot: Toot) => new Date(toot.createdAt) > lastOpenedAt);
};
