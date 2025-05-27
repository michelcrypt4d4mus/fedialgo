/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
import MastoApi from "../api/api";
import MastodonServer from "../api/mastodon_server";
import TagList from "../api/objects/tag_list";
import Toot from "../api/objects/toot";
import UserData from "../api/user_data";
import { bracketed } from "../helpers/string_helpers";
import { CacheKey, MastodonTag, TagWithUsageCounts } from "../types";
import { config, TagTootsConfig } from "../config";
import { traceLog } from "../helpers/log_helpers";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";


// Get toots for hashtags the user has favourited a lot
export async function getFavouritedTagToots(): Promise<Toot[]> {
    const tagList = await TagList.fromFavourites();
    return await getCacheableTootsForTags(tagList, CacheKey.FAVOURITED_HASHTAG_TOOTS);
};


// Get recent toots from hashtags the user has participated in frequently
export async function getParticipatedHashtagToots(): Promise<Toot[]> {
    const tagList = await TagList.fromParticipated();
    await tagList.removeFollowedAndMutedTags();
    await tagList.removeTrendingTags();
    return await getCacheableTootsForTags(tagList, CacheKey.PARTICIPATED_TAG_TOOTS);
};


// Get toots for the top trending tags via the search endpoint.
export async function getRecentTootsForTrendingTags(): Promise<Toot[]> {
    const tagList = await TagList.fromTrending();
    return await getCacheableTootsForTags(tagList, CacheKey.TRENDING_TAG_TOOTS);
};


// Get toots for a list of tags, caching the results
async function getCacheableTootsForTags(tagList: TagList, cacheKey: CacheKey): Promise<Toot[]> {
    return await MastoApi.instance.getCacheableToots(
        async () => await MastoApi.instance.getStatusesForTags(tagList.topTags(), tagList.tootsConfig!.numTootsPerTag),
        cacheKey,
        tagList.tootsConfig!.maxToots,
    );
};
