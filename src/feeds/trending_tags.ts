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
import { TrendingTag, TrendingTagToots } from "../types";

const LOG_PREFIX = "[TrendingTags]";


export default async function fetchRecentTootsForTrendingTags(): Promise<TrendingTagToots> {
    const trendingTags = await MastodonServer.fediverseTrendingTags();
    const tootTags: Toot[][] = await Promise.all(trendingTags.map(getTootsForTag));
    const toots: Toot[] = Toot.dedupeToots(tootTags.flat(), LOG_PREFIX);
    toots.sort((a, b) => b.popularity() - a.popularity())

    return {
        tags: trendingTags,
        toots: toots.slice(0, Storage.getConfig().numTrendingTagsToots),
    };
};


// Get latest toots for a given tag and populate trendingToots property
async function getTootsForTag(tag: TrendingTag): Promise<Toot[]> {
    // TODO: this doesn't append a an octothorpe to the tag name when searching. Should it?
    const toots = await MastoApi.instance.searchForToots(
        tag.name,
        Storage.getConfig().numTootsPerTrendingTag
    );

    // Inject the tag into each toot as a trendingTag element
    toots.forEach((toot) => {
        toot.trendingTags ||= [];
        toot.trendingTags.push(tag);
    });

    console.debug(`Found toots for trending tag '${tag.name}':`, toots);
    return toots;
};
