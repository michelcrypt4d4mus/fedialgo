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

import MastodonApiCache from "../api/mastodon_api_cache";
import Storage from "../Storage";
import { dedupeToots } from "../helpers";
import { popularity } from "../objects/toot";
import { getTootsForTag, mastodonFetch } from "../api/api";
import { Toot, TrendingTag } from "../types";

const TRENDING_TOOTS_REST_PATH = "api/v1/trends/tags";
const LOG_PREFIX = "[TrendingTags]";


export default async function getRecentTootsForTrendingTags(api: mastodon.rest.Client): Promise<Toot[]> {
    const tags = await getTrendingTags(api);
    const tootses: Toot[][] = await Promise.all(tags.map((tag: TrendingTag) => getTootsForTag(api, tag)));
    const toots: Toot[] = dedupeToots(tootses.flat(), "trendingTags");
    console.log(`${LOG_PREFIX} deduped toots for trending tags:`, toots);
    return toots.sort(popularity).reverse().slice(0, Storage.getConfig().numTrendingTagsToots);
};


// Find tags that are trending across the Fediverse by adding up the number uses of the tag
async function getTrendingTags(api: mastodon.rest.Client): Promise<TrendingTag[]> {
    console.log(`${LOG_PREFIX} getTrendingTags() called`)
    const topDomains = await MastodonApiCache.getTopServerDomains(api);
    const numTrendingTagsPerServer = Storage.getConfig().numTrendingTagsPerServer;

    // Pull top trending toots from each server
    const trendingTags = await Promise.all(topDomains.map(
        async (server: string): Promise<TrendingTag[]> => {
            let tags: TrendingTag[] = [];

            try {
                tags = await mastodonFetch<mastodon.v1.Tag[]>(
                    server,
                    TRENDING_TOOTS_REST_PATH,
                    numTrendingTagsPerServer
                ) as TrendingTag[];
                if (!tags || tags.length == 0) throw new Error(`No tags found on '${server}'!`);
            } catch (e) {
                console.warn(`${LOG_PREFIX} Failed to get trending toots from '${server}'!`, e);
                return [];
            }

            tags = tags.slice(0, numTrendingTagsPerServer);
            tags.forEach(decorateTagData);
            console.debug(`${LOG_PREFIX} trendingTags for server '${server}':`, tags);
            return tags;
        }
    ));

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


// Lowercase the tag text; Inject toot / account counts summed over last NUM_DAYS_TO_COUNT_TAG_DATA.
function decorateTagData(tag: TrendingTag): void {
    tag.name = tag.name.toLowerCase();

    if (!tag?.history || tag.history.length == 0) {
        console.warn(`${LOG_PREFIX} decorateTagData() found no history for tag:`, tag);
        tag.history = [];
    }

    const recentHistory = tag.history.slice(0, Storage.getConfig().numDaysToCountTrendingTagData);
    tag.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    tag.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
};
