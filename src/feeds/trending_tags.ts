/*
 * Pull top trending tags on mastodon server (servers?).
 *
 * example trending tag:
 * {
 *   "name": "southkorea",
 *   "url": "https://journa.host/tags/southkorea",
 *   "history": [
 *     {
 *       "day": "1733184000",
 *       "accounts": "125",
 *       "uses": "374"
 *     },
 *     {
 *       "day": "1733097600",
 *       "accounts": "4",
 *       "uses": "146"
 *     },
 *     <...snip, usually 7 days of info...>
 *   ]
 * }
 */
import { mastodon } from "masto";

import MastodonApiCache from "../features/mastodon_api_cache";
import { mastodonFetch } from "../helpers";
import { TrendingTag } from "../types";

const NUM_HOURS_BEFORE_REFRESH = 8;
const NUM_MS_BEFORE_REFRESH = NUM_HOURS_BEFORE_REFRESH * 60 * 60 * 1000;
const NUM_TRENDING_TOOTS_PER_SERVER = 30;
const TRENDING_TOOTS_REST_PATH = "api/v1/trends/tags";


export default async function getTrendingTags(api: mastodon.rest.Client): Promise<TrendingTag[]> {
    console.log(`[TrendingTags] getTrendingTags() called`)
    const coreServers = await MastodonApiCache.getCoreServer(api);

    // Count the number of followed users per server
    const topServerDomains = Object.keys(coreServers)
                                   .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)
                                   .sort((a, b) => (coreServers[b] - coreServers[a]));

    console.log(`[TrendingTags] Found top mastodon servers: `, topServerDomains);

    // Pull top trending toots from each server
    const trendingTags = await Promise.all(topServerDomains.map(async (server: string): Promise<TrendingTag[]> => {
        let tags = await mastodonFetch<mastodon.v1.Tag[]>(server, TRENDING_TOOTS_REST_PATH) as TrendingTag[];

        if (!tags || tags.length == 0) {
            console.warn(`[TrendingTags] Failed to get trending toots from '${server}'! trendingTags:`, tags);
            return [];
        }

        // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
        // and inject a trendingRank score property that is reverse-ordered, e.g most popular trending
        // toot gets NUM_TRENDING_TOOTS_PER_SERVER points, least trending gets 1).
        // serverTopToots = serverTopToots.filter(toot => toot?.favouritesCount > 0 || toot?.reblogsCount > 0)
        tags = tags.slice(0, NUM_TRENDING_TOOTS_PER_SERVER)
                                    //    .map((tag: TrendingTag, i: number) => {
                                    //         // Inject the @server info to the account string
                                    //         const acct = tag.account.acct;

                                    //         if (acct && !acct.includes("@")) {
                                    //             toot.account.acct = `${acct}@${toot.account.url.split("/")[2]}`;
                                    //         }

                                    //         // Inject trendingRank score
                                    //         toot.trendingRank = NUM_TRENDING_TOOTS_PER_SERVER - i + 1;
                                    //         return toot;
                                    //    });

        console.log(`[TrendingTags] trendingTags for server '${server}':`, tags);
        return tags;
    }));

    return trendingTags.flat();
};
