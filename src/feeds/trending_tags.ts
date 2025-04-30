/*
 * Pull top trending tags on mastodon servers and get a set of toots for each.
 * Example trending tag:
 *   {
 *       "name": "southkorea",
 *       "url": "https://journa.host/tags/southkorea",
 *       "history": [
 *           {
 *               "day": "1733184000",
 *               "accounts": "125",
 *               "uses": "374"
 *           },
 *           {
 *               "day": "1733097600",
 *               "accounts": "4",
 *               "uses": "146"
 *           },
 *           <...snip, usually 7 days of info...>
 *       ]
 *   }
 */
import MastodonServer from "../api/mastodon_server";
import Storage from "../Storage";
import Toot from "../api/objects/toot";
import { MastoApi } from "../api/api";
import { TrendingTag } from "../types";

const LOG_PREFIX = "TrendingTags";


// Get toots for the top trending tags via the search endpoint. Results are not cached explicity
// though they are implicitly cached as part of the main timeline cache.
// TODO: Move this to mastodon_server.ts or api.ts
export async function fetchRecentTootsForTrendingTags(): Promise<Toot[]> {
    const trendingTags = await MastodonServer.fediverseTrendingTags();
    const tootTags: Toot[][] = await Promise.all(trendingTags.map(getTootsForTag));
    let toots = Toot.dedupeToots(tootTags.flat(), LOG_PREFIX);
    toots.sort((a, b) => b.popularity() - a.popularity())
    toots = toots.slice(0, Storage.getConfig().numTrendingTagsToots);
    await Toot.setDependentProps(toots);
    return toots;
};


// Get latest toots for a given tag and populate trendingToots property
// TODO: there's an endpoint for getting recent tags but this is using the search endpoint.
async function getTootsForTag(tag: TrendingTag): Promise<Toot[]> {
    // TODO: this doesn't append a an octothorpe to the tag name when searching. Should it?
    const numToots = Storage.getConfig().numTootsPerTrendingTag;
    const toots = await MastoApi.instance.searchForToots(tag.name, numToots, 'trending tag');
    return toots;
};
