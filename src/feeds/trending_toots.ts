/*
 * Pull top trending toots on mastodon server (servers?) including from accounts user
 * doesn't follow.
 */
import { mastodon } from "masto";

import MastodonApiCache from "../features/mastodon_api_cache";
import { average, dedupeToots, mastodonFetch } from '../helpers';
import { condensedStatus } from "../objects/toot";
import { Toot } from "../types";

const NUM_TRENDING_TOOTS_PER_SERVER = 30;
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
    let trendingTootses: Toot[][] = await Promise.all(
        topServerDomains.map(async (server: string): Promise<Toot[]> => {
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

            console.debug(`trendingToots for '${server}': `, serverTopToots.map(condensedStatus));
            return serverTopToots;
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
        const msg = `Found ${toots.length} of ${uri} (trendingRanks: ${trendingRanks}, avg: ${avgScore}).`;
        console.debug(`${msg} First toot:`, toots[0]);
        toots.forEach(toot => toot.trendingRank = avgScore);
    });

    return rankedToots;
};
