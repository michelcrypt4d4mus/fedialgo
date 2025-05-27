/*
 * Helper class for fetching toots for a list of tags, e.g. trending or particiapted tags.
 */
import MastoApi from "./api";
import Toot from "./objects/toot";
import TagList from "./tag_list";
import { CacheKey, TagWithUsageCounts } from "../types";
import { config, TagTootsConfig } from "../config";
import { traceLog } from "../helpers/log_helpers";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";

type TagTootsCacheKey = CacheKey.PARTICIPATED_TAG_TOOTS
    | CacheKey.FAVOURITED_HASHTAG_TOOTS
    | CacheKey.TRENDING_TAG_TOOTS;


export default class TootsForTagsList {
    cacheKey: TagTootsCacheKey;
    tagList: TagList;
    tootsConfig: TagTootsConfig;

    // Alternate constructor
    static async create(cacheKey: TagTootsCacheKey): Promise<TootsForTagsList> {
        let tootsConfig: TagTootsConfig;
        let tagList: TagList;

        if (cacheKey === CacheKey.FAVOURITED_HASHTAG_TOOTS) {
            tootsConfig = config.favouritedTags;
            tagList = await TagList.fromFavourites();
            await tagList.removeFollowedAndMutedTags();
            await tagList.removeTrendingTags();
            tagList.removeInvalidTrendingTags();
        } else if (cacheKey === CacheKey.PARTICIPATED_TAG_TOOTS) {
            tootsConfig = config.participatedTags;
            tagList = await TagList.fromParticipated();
            await tagList.removeFollowedAndMutedTags();
            await tagList.removeTrendingTags();
        } else if (cacheKey === CacheKey.TRENDING_TAG_TOOTS) {
            tootsConfig = config.trending.tags;
            tagList = await TagList.fromTrending();
        } else {
            throw new Error(`TootsForTagsList: Invalid cacheKey ${cacheKey}`);
        }

        return new TootsForTagsList(cacheKey, tagList, tootsConfig);
    }

    // Create then immediately fetch toots for the tags
    static async getTootsForTags(cacheKey: TagTootsCacheKey): Promise<Toot[]> {
        const tagList = await TootsForTagsList.create(cacheKey);
        return await tagList.getToots();
    }

    private constructor(cacheKey: TagTootsCacheKey, tagList: TagList, tootsConfig: TagTootsConfig) {
        this.tagList = tagList;
        this.cacheKey = cacheKey;
        this.tootsConfig = tootsConfig;
    }

    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags?: number): TagWithUsageCounts[] {
        numTags ||= this.tootsConfig.numTags;
        return truncateToConfiguredLength(this.tagList.topTags(), numTags, this.cacheKey);
    }

    // Get toots for the list of tags, caching the results
    async getToots(): Promise<Toot[]> {
        return await MastoApi.instance.getCacheableToots(
            async () => await MastoApi.instance.getStatusesForTags(this.topTags(), this.tootsConfig.numTootsPerTag),
            this.cacheKey,
            this.tootsConfig.maxToots,
        );
    };
};
