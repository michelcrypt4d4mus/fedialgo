/*
 * Pull top trending toots on mastodon server (servers?) including from accounts user
 * doesn't follow.
 */
import { mastodon } from "masto";

import MastodonApiCache from "../api/mastodon_api_cache";
import Storage from "../Storage";
import { average, dedupeToots } from '../helpers';
import { condensedStatus, popularity } from "../api/objects/toot";
import { mastodonFetch } from "../api/api";
import { Toot } from "../types";

const TRENDING_TOOTS_REST_PATH = "api/v1/trends/statuses";


export default async function getTrendingToots(api: mastodon.rest.Client): Promise<Toot[]> {
    console.log(`[TrendingToots] getTrendingToots() called`)
    const topServerDomains = await MastodonApiCache.getTopServerDomains(api);
    const numTrendingTootsPerServer = Storage.getConfig().numTrendingTootsPerServer;

    // Pull top trending toots from each server
    let trendingTootses: Toot[][] = await Promise.all(
        topServerDomains.map(async (server: string): Promise<Toot[]> => {
            let topToots: Toot[] | undefined = [];

            try {
                topToots = await mastodonFetch<Toot[]>(server, TRENDING_TOOTS_REST_PATH);

                if (!topToots || topToots.length == 0) {
                    throw new Error(`Failed to get top toots on '${server}'! topToots: ${topToots}`);
                }
            } catch (e) {
                console.warn(`Error fetching trending toots from '${server}':`, e);
                return [];
            }

            // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
            // and inject a trendingRank score property that is reverse-ordered, e.g most popular trending
            // toot gets numTrendingTootsPerServer points, least trending gets 1).
            topToots = topToots.filter(toot => popularity(toot) > 0)
                               .slice(0, numTrendingTootsPerServer)
                               .map((toot: Toot, i: number) => {
                                    // Inject the @server info to the account string
                                    const acct = toot.account.acct;

                                    if (acct && !acct.includes("@")) {
                                        toot.account.acct = `${acct}@${toot.account.url.split("/")[2]}`;
                                    }

                                    // Inject trendingRank score
                                    toot.trendingRank = 1 + numTrendingTootsPerServer - i;
                                    return toot;
                                });

            console.debug(`trendingToots for '${server}': `, topToots.map(condensedStatus));
            return topToots;
        })
    );

    const trendingToots = dedupeToots(setTrendingRankToAvg(trendingTootses.flat()), "getTrendingToots");
    console.log(`[getTrendingToots] trendingToots:`, trendingToots);
    return trendingToots;
};


// A toot can trend on multiple servers, in which case we want to compute the
// average trendingRank and update the toots accordingly.
// TODO: maybe we should add the # of servers to the avg?
function setTrendingRankToAvg(rankedToots: Toot[]): Toot[] {
    const tootsTrendingOnMultipleServers = rankedToots.reduce(
        (acc, toot) => {
            if (!toot.trendingRank) return acc;
            acc[toot.uri] ||= [];
            acc[toot.uri].push(toot);
            return acc;
        },
        {} as Record<string, Toot[]>
    );

    Object.entries(tootsTrendingOnMultipleServers).forEach(([uri, toots]) => {
        if (toots.length <= 1) return;

        const trendingRanks = toots.map(t => t.trendingRank) as number[];
        const avgScore = average(trendingRanks);
        // const msg = `Found ${toots.length} toots of ${uri} (trendingRanks: ${trendingRanks}, avg: ${avgScore}).`;
        // console.debug(`${msg} First toot:`, toots[0]);
        toots.forEach(toot => toot.trendingRank = avgScore);
    });

    return rankedToots;
};
