/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
import MastoApi from "../api/api";
import TagList, { TagsForTootsList } from "../api/objects/tag_list";
import Toot from "../api/objects/toot";
import { CacheKey } from "../types";


// Get toots for hashtags the user has favourited a lot
export async function getFavouritedTagToots(): Promise<Toot[]> {
    const participatedTags = (await TagList.fromParticipated()).tagNameDict();
    const tagList = await TagList.fromFavourites();
    await tagList.removeFollowedAndMutedTags();
    await tagList.removeTrendingTags();
    tagList.removeInvalidTrendingTags();
    // Filter out tags that have high participation by the fedialgo user
    // TODO: make this a config value or (better) a heuristic based on the data
    tagList.tags = tagList.tags.filter((tag) => !((participatedTags[tag.name]?.numToots || 0) >= 2));
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
