/*
 * Pull top trending toots on mastodon server (servers?) including from accounts user
 * doesn't follow.
 */
import { mastodon } from "masto";

import MastodonApiCache from "../features/mastodon_api_cache";
import { condensedStatus } from "../helpers";
import { mastodonFetch } from "../helpers";
import { Toot } from "../types";

const NUM_HOURS_BEFORE_REFRESH = 8;
const NUM_MS_BEFORE_REFRESH = NUM_HOURS_BEFORE_REFRESH * 60 * 60 * 1000;
const NUM_TRENDING_TOOTS_PER_SERVER = 20;
const TRENDING_TOOTS_REST_PATH = "api/v1/trends/statuses";


export default async function getTrendingToots(api: mastodon.rest.Client): Promise<Toot[]> {
    const coreServers = await MastodonApiCache.getCoreServer(api);

    // Count the number of followed users per server
    const topServerDomains = Object.keys(coreServers)
                                   .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)
                                   .sort((a, b) => (coreServers[b] - coreServers[a]));

    if (topServerDomains.length == 0) {
        console.warn("No mastodon servers found to get getTrendingToots data from!");
        return [];
    }

    console.log(`Found top mastodon servers: `, topServerDomains);

    // Pull top trending toots from each server
    const trendingToots = await Promise.all(topServerDomains.map(async (server: string): Promise<Toot[]> => {
        let serverTopToots = await mastodonFetch<Toot[]>(server, TRENDING_TOOTS_REST_PATH);

        if (!serverTopToots || serverTopToots.length == 0) {
            console.warn(`Failed to get trending toots from '${server}'! serverTopToots:`, serverTopToots);
            return [];
        }

        // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
        // and inject a trendingRank score property that is reverse-ordered, e.g most popular trending
        // toot gets NUM_TRENDING_TOOTS_PER_SERVER points, least trending gets 1).
        serverTopToots = serverTopToots.filter(toot => toot?.favouritesCount > 0 || toot?.reblogsCount > 0)
                                       .slice(0, NUM_TRENDING_TOOTS_PER_SERVER)
                                       .map((toot: Toot, i: number) => {
                                            // Inject the @server info to the account string
                                            const acct = toot.account.acct;

                                            if (acct && !acct.includes("@")) {
                                                toot.account.acct = `${acct}@${toot.account.url.split("/")[2]}`;
                                            }

                                            // Inject trendingRank score
                                            toot.trendingRank = NUM_TRENDING_TOOTS_PER_SERVER - i + 1;
                                            return toot;
                                       });

        console.log(`topToots for server '${server}': `, serverTopToots.map(condensedStatus));
        return serverTopToots;
    }));

    return trendingToots.flat();
};
