/*
 * Helper class for fetching toots for a list of tags, e.g. trending or particiapted tags.
 */
import MastoApi from "./api";
import Toot from "./objects/toot";
import TagList from "./tag_list";
import { CacheKey } from "../enums";
import { config, TagTootsConfig } from "../config";
import { Logger } from '../helpers/logger';
import { tagStr } from "./objects/tag";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";
import { type TagWithUsageCounts } from "../types";

export type TagTootsCacheKey =
      CacheKey.FAVOURITED_TAG_TOOTS
    | CacheKey.PARTICIPATED_TAG_TOOTS
    | CacheKey.TRENDING_TAG_TOOTS;

const HASHTAG_TOOTS_CONFIG: Record<TagTootsCacheKey, TagTootsConfig> = {
    [CacheKey.FAVOURITED_TAG_TOOTS]: config.favouritedTags,
    [CacheKey.PARTICIPATED_TAG_TOOTS]: config.participatedTags,
    [CacheKey.TRENDING_TAG_TOOTS]: config.trending.tags,
};


export default class TootsForTagsList {
    cacheKey: TagTootsCacheKey;
    config: TagTootsConfig;
    logger: Logger;
    tagList: TagList;

    // Alternate constructor
    static async create(cacheKey: TagTootsCacheKey): Promise<TootsForTagsList> {
        const tootsConfig = HASHTAG_TOOTS_CONFIG[cacheKey];
        let tagList: TagList;

        if (cacheKey === CacheKey.FAVOURITED_TAG_TOOTS) {
            tagList = await TagList.fromFavourites();
            await this.removeUnwantedTags(tagList, tootsConfig);
            // Remove tags that have been used in 2 or more toots by the user
            // TODO: use a configured value or a heuristic instead of hardcoded 2
            const participatedTags = (await TagList.fromParticipated()).tagNameDict();
            tagList.tags = tagList.tags.filter((tag) => (participatedTags[tag.name]?.numToots || 0) <= 3);
        } else if (cacheKey === CacheKey.PARTICIPATED_TAG_TOOTS) {
            tagList = await TagList.fromParticipated();
            await this.removeUnwantedTags(tagList, tootsConfig);
        } else if (cacheKey === CacheKey.TRENDING_TAG_TOOTS) {
            tagList = await TagList.fromTrending();
        } else {
            throw new Error(`TootsForTagsList: Invalid cacheKey ${cacheKey}`);
        }

        return new TootsForTagsList(cacheKey, tagList, tootsConfig);
    }

    private constructor(cacheKey: TagTootsCacheKey, tagList: TagList, tagsConfig: TagTootsConfig) {
        this.cacheKey = cacheKey;
        this.config = tagsConfig;
        this.logger = new Logger(cacheKey);
        this.tagList = tagList;
    }

    // Get toots for the list of tags, caching the results
    async getToots(): Promise<Toot[]> {
        return await MastoApi.instance.getCacheableToots(
            async () => {
                const tags = this.topTags();
                this.logger.log(`getToots() called for ${tags.length} tags:`, tags.map(t => t.name));

                const tagToots = await Promise.all(
                    tags.map(async (tag) => {
                        return await MastoApi.instance.getStatusesForTag(
                            tag,
                            this.logger,
                            this.config.numTootsPerTag
                        );
                    }
                ));

                return tagToots.flat();
            },
            this.cacheKey,
            this.config.maxToots,
        );
    };

    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags?: number): TagWithUsageCounts[] {
        numTags ||= this.config.numTags;
        const tags = truncateToConfiguredLength(this.tagList.topTags(), numTags, this.logger);
        this.logger.debug(`topTags:\n`, tags.map((t, i) => `${i + 1}: ${tagStr(t)}`).join("\n"));
        return tags;
    }

    // Create then immediately fetch toots for the tags
    static async getToots(cacheKey: TagTootsCacheKey): Promise<Toot[]> {
        const tagList = await TootsForTagsList.create(cacheKey);
        return await tagList.getToots();
    }

    private static async removeUnwantedTags(tagList: TagList, tootsConfig: TagTootsConfig): Promise<void> {
        await tagList.removeFollowedAndMutedTags();
        tagList.removeInvalidTrendingTags();
        tagList.removeKeywordsFromTags((await TagList.fromTrending()).tags.map(t => t.name)); // Remove trending tags
        tagList.removeKeywordsFromTags(tootsConfig.invalidTags || []);
    }
};
