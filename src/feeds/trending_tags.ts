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
const NUM_DAYS_TO_COUNT_TAG_DATA = 3;


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

        tags = tags.slice(0, NUM_TRENDING_TOOTS_PER_SERVER);
        tags.forEach(decorateTagData);
        console.log(`[TrendingTags] trendingTags for server '${server}':`, tags);
        return tags;
    }));

    const aggregatedTags = trendingTags.flat().reduce((tags: TrendingTag[], tag: TrendingTag) => {
        const existingTag = tags.find(t => t.name === tag.name);

        if (existingTag) {
            existingTag.numAccounts = (existingTag.numAccounts || 0) + (tag.numAccounts || 0);
            existingTag.numToots = (existingTag.numToots || 0) + (tag.numToots || 0);
        } else {
            tags.push(tag);
        }

        return tags;
    }, [] as TrendingTag[]);

    aggregatedTags.sort((a, b) => (b.numToots || 0) - (a.numToots || 0));
    console.log(`[TrendingTags] Aggregated trending tags:`, aggregatedTags);
    return aggregatedTags;
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
