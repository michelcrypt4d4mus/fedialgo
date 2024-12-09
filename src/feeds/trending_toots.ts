/*
 * Pull top trending toots on mastodon server (servers?) including from accounts user
 * doesn't follow.
 */
import { mastodon } from "masto";

import Toot from "../api/objects/toot";
import { average } from '../helpers';
import { MastoApi } from "../api/api";
import { mastodonFetch } from "../api/mastodon_servers_info";


export default async function getTrendingToots(api: mastodon.rest.Client): Promise<Toot[]> {
    console.log(`[TrendingToots] getTrendingToots() called`)
    const topServerDomains = await MastoApi.instance.getTopServerDomains(api);

    // Pull top trending toots from each server
    let trendingTootses: Toot[][] = await Promise.all(
        topServerDomains.map(async (server: string): Promise<Toot[]> => {
            let topToots: Toot[] | undefined = [];

            try {
                topToots = await mastodonFetch<Toot[]>(server, MastoApi.trendUrl("statuses"));
                if (!topToots?.length) throw new Error(`Failed to get topToots: ${JSON.stringify(topToots)}`);
                topToots = topToots.map(t => new Toot(t));
            } catch (e) {
                console.warn(`Error fetching trending toots from '${server}':`, e);
                return [];
            }

            // Ignore toots that have no favourites or retoots, append @server.tld to account strings,
            // and inject a trendingRank score property that is reverse-ordered, e.g most popular trending
            // toot gets numTrendingTootsPerServer points, least trending gets 1).
            topToots = topToots.filter(toot => toot.popularity() > 0)
                               .map((toot: Toot, i: number) => {
                                    toot.trendingRank = 1 + (topToots?.length || 0) - i;
                                    return toot;
                                });

            console.debug(`trendingToots for '${server}': `, topToots.map(t => t.condensedStatus()));
            return topToots;
        })
    );

    return Toot.dedupeToots(setTrendingRankToAvg(trendingTootses.flat()), "getTrendingToots");
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
