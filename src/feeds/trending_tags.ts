/*
 * Pull top trending tags on mastodon server (servers?). Example trending tag:
 *
 *   {
 *     "name": "southkorea",
 *     "url": "https://journa.host/tags/southkorea",
 *     "history": [
 *       {
 *         "day": "1733184000",
 *         "accounts": "125",
 *         "uses": "374"
 *       },
 *       {
 *         "day": "1733097600",
 *         "accounts": "4",
 *         "uses": "146"
 *       },
 *       <...snip, usually 7 days of info...>
 *     ]
 *   }
 */
import { mastodon } from "masto";

import MastodonApiCache from "../api/mastodon_api_cache";
import Storage from "../Storage";
import { dedupeToots } from "../api/objects/toot";
import { fetchTrendingTags } from "../api/mastodon_servers_info";
import { getTootsForTag } from "../api/api";
import { popularity } from "../api/objects/toot";
import { Toot, TrendingTag } from "../types";

const LOG_PREFIX = "[TrendingTags]";


export default async function getRecentTootsForTrendingTags(api: mastodon.rest.Client): Promise<Toot[]> {
    const tags = await getTrendingTags(api);
    const tootses: Toot[][] = await Promise.all(tags.map((tag) => getTootsForTag(api, tag)));
    const toots: Toot[] = dedupeToots(tootses.flat(), "trendingTags");
    return toots.sort(popularity).reverse().slice(0, Storage.getConfig().numTrendingTagsToots);
};


// Find tags that are trending across the Fediverse by adding up the number uses of the tag
async function getTrendingTags(api: mastodon.rest.Client): Promise<TrendingTag[]> {
    console.log(`${LOG_PREFIX} getTrendingTags() called`)
    const topDomains = await MastodonApiCache.getTopServerDomains(api);
    const trendingTags = await Promise.all(topDomains.map(fetchTrendingTags));

    // Aggregate how many toots and users in the past NUM_DAYS_TO_COUNT_TAG_DATA days across all servers
    const aggregatedTags = trendingTags.flat().reduce(
        (tags, tag) => {
            const existingTag = tags.find(t => t.name === tag.name);

            if (existingTag) {
                existingTag.numAccounts = (existingTag.numAccounts || 0) + (tag.numAccounts || 0);
                existingTag.numToots = (existingTag.numToots || 0) + (tag.numToots || 0);
            } else {
                tags.push(tag);
            }

            return tags;
        },
        [] as TrendingTag[]
    );

    aggregatedTags.sort((a, b) => (b.numToots || 0) - (a.numToots || 0));
    console.log(`${LOG_PREFIX} Aggregated trending tags:`, aggregatedTags);
    return aggregatedTags.slice(0, Storage.getConfig().numTrendingTags);
};
