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
import { dedupeToots, mastodonFetch } from "../helpers";
import { Toot, TrendingTag } from "../types";

const TRENDING_TOOTS_REST_PATH = "api/v1/trends/tags";
const NUM_DAYS_TO_COUNT_TAG_DATA = 3;
const NUM_TRENDING_TAGS_PER_SERVER = 20;
const NUM_TRENDING_TAG_TOOTS_PER_SERVER = 20;
const NUM_TRENDING_TAGS = 20;
const NUM_TRENDING_TAG_TOOTS = 100;


export default async function getRecentTootsForTrendingTags(api: mastodon.rest.Client): Promise<Toot[]> {
    const tags = await getTrendingTags(api);
    const tootses: Toot[][] = await Promise.all(tags.map((tag: TrendingTag) => getTootsForTag(api, tag)));
    const toots: Toot[] = dedupeToots(tootses.flat(), "trendingTags");
    console.log(`[TrendingTags] deduped toots for trending tags:`, toots);
    return toots;
};


// Find tags that are trending across the Fediverse by adding up the number uses of the tag
async function getTrendingTags(api: mastodon.rest.Client): Promise<TrendingTag[]> {
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

        tags = tags.slice(0, NUM_TRENDING_TAGS_PER_SERVER);
        tags.forEach(decorateTagData);
        console.debug(`[TrendingTags] trendingTags for server '${server}':`, tags);
        return tags;
    }));

    // Aggregate how many toots and users in the past NUM_DAYS_TO_COUNT_TAG_DATA days across all servers
    const aggregatedTags = trendingTags.flat().reduce(
        (tags: TrendingTag[], tag: TrendingTag) => {
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
    console.log(`[TrendingTags] Aggregated trending tags:`, aggregatedTags);
    return aggregatedTags.slice(0, NUM_TRENDING_TAGS);
};


async function getTootsForTag(api: mastodon.rest.Client, tag: TrendingTag): Promise<Toot[]> {
    try {
        console.debug(`[TrendingTags] getting toots for tag:`, tag);
        const mastoQuery: mastodon.rest.v1.SearchParams = { limit: NUM_TRENDING_TAG_TOOTS_PER_SERVER, q: tag.name, type: "statuses" };
        const searchResult = await api.v2.search.fetch(mastoQuery);
        const toots = searchResult.statuses as Toot[];

        toots.forEach((toot) => {
            toot.trendingTags ||= [];
            toot.trendingTags.push(tag);
        });

        console.debug(`[TrendingTags] Found toots for tag '${tag.name}':`, toots);
        return toots;
    } catch (e) {
        console.warn(`[TrendingTags] Failed to get toots for tag '${tag.name}':`, e);
        return [];
    }
};


// Inject toot and account counts (how many toots and users are using the trending tag)
function decorateTagData(tag: TrendingTag): void {
    if (!tag?.history || tag.history.length == 0) {
        console.warn(`[TrendingTags] decorateTagData() found no history for tag:`, tag);
        tag.numAccounts = 0;
        tag.numToots = 0;
        return;
    }

    const recentHistory = tag.history.slice(0, NUM_DAYS_TO_COUNT_TAG_DATA);
    tag.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    tag.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
};
