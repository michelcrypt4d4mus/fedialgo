/*
 * Helper class for fetching toots for a list of tags, e.g. trending or particiapted tags.
 */
import MastoApi from "./api";
import Toot from "./objects/toot";
import TagList from "./tag_list";
import { CacheKey, TagWithUsageCounts } from "../types";
import { config, TagTootsConfig } from "../config";
import { tagStr } from "./objects/tag";
import { traceLog } from "../helpers/log_helpers";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";
import { bracketed } from "../helpers/string_helpers";

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
            await this.removeUnwantedTags(tagList, tootsConfig);
            // Remove tags that have been used in 2 or more toots by the user
            // TODO: use a configured value or a heuristic instead of hardcoded 2
            const participatedTags = (await TagList.fromParticipated()).tagNameDict();
            tagList.tags = tagList.tags.filter((tag) => (participatedTags[tag.name]?.numToots || 0) <= 3);
        } else if (cacheKey === CacheKey.PARTICIPATED_TAG_TOOTS) {
            tootsConfig = config.participatedTags;
            tagList = await TagList.fromParticipated();
            await this.removeUnwantedTags(tagList, tootsConfig);
        } else if (cacheKey === CacheKey.TRENDING_TAG_TOOTS) {
            tootsConfig = config.trending.tags;
            tagList = await TagList.fromTrending();
        } else {
            throw new Error(`TootsForTagsList: Invalid cacheKey ${cacheKey}`);
        }

        return new TootsForTagsList(cacheKey, tagList, tootsConfig);
    }

    // Create then immediately fetch toots for the tags
    static async getToots(cacheKey: TagTootsCacheKey): Promise<Toot[]> {
        const tagList = await TootsForTagsList.create(cacheKey);
        return await tagList.getToots();
    }

    private constructor(cacheKey: TagTootsCacheKey, tagList: TagList, tootsConfig: TagTootsConfig) {
        this.cacheKey = cacheKey;
        this.tagList = tagList;
        this.tootsConfig = tootsConfig;
    }

    // Get toots for the list of tags, caching the results
    async getToots(): Promise<Toot[]> {
        return await MastoApi.instance.getCacheableToots(
            async () => await MastoApi.instance.getStatusesForTags(this.topTags(), this.tootsConfig.numTootsPerTag),
            this.cacheKey,
            this.tootsConfig.maxToots,
        );
    };

    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags?: number): TagWithUsageCounts[] {
        numTags ||= this.tootsConfig.numTags;
        const tags = truncateToConfiguredLength(this.tagList.topTags(), numTags, this.cacheKey);
        console.debug(`${bracketed(this.cacheKey)} topTags:\n`, tags.map((t, i) => `${i + 1}: ${tagStr(t)}`).join("\n"));
        return tags;
    }

    private static async removeUnwantedTags(tagList: TagList, tootsConfig: TagTootsConfig): Promise<void> {
        await tagList.removeFollowedAndMutedTags();
        await tagList.removeTrendingTags();
        tagList.removeInvalidTrendingTags();
        tagList.removeKeywordsFromTags(tootsConfig.invalidTags || []);
    }
};
