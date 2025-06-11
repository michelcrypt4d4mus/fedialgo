/*
 * Helper class for fetching toots for a list of tags, e.g. trending or particiapted tags.
 */
import Logger from '../helpers/logger';
import MastoApi from "./api";
import MastodonServer from "./mastodon_server";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { config, TagTootsConfig } from "../config";
import { tagInfoStr } from "./objects/tag";
import { TagTootsCacheKey } from "../enums";
import { truncateToConfiguredLength, zipPromiseCalls } from "../helpers/collection_helpers";
import { type TagWithUsageCounts } from "../types";

type TagTootsBuildConfig = {
    buildTagList: () => Promise<TagList>;
    config: TagTootsConfig;
};

const HASHTAG_TOOTS_CONFIG: Record<TagTootsCacheKey, TagTootsBuildConfig> = {
    [TagTootsCacheKey.FAVOURITED_TAG_TOOTS]: {
        buildTagList: async () => {
            const tagList = await TagList.fromFavourites();
            // Remove tags that user uses often (we want only what they favourite, not what they participate in)
            const participatedTags = await TagList.fromParticipated();
            const maxParticipations = config.favouritedTags.maxParticipations;  // TODO: use heuristic to pick this number?
            return tagList.filter(tag => (participatedTags.getTag(tag)?.numToots || 0) <= maxParticipations);
        },
        config: config.favouritedTags,
    },
    [TagTootsCacheKey.PARTICIPATED_TAG_TOOTS]: {
        buildTagList: TagList.fromParticipated,
        config: config.participatedTags,
    },
    [TagTootsCacheKey.TRENDING_TAG_TOOTS]: {
        buildTagList: async () => await MastodonServer.fediverseTrendingTags(),
        config: config.trending.tags,
    }
};


export default class TagsForFetchingToots {
    cacheKey: TagTootsCacheKey;
    config: TagTootsConfig;
    logger: Logger;
    tagList: TagList;

    // Alternate constructor
    static async create(cacheKey: TagTootsCacheKey): Promise<TagsForFetchingToots> {
        const tootsConfig = HASHTAG_TOOTS_CONFIG[cacheKey];
        const tagList = await tootsConfig.buildTagList();
        const tagsForTootsList = new TagsForFetchingToots(cacheKey, tagList, tootsConfig.config);
        await tagsForTootsList.removeUnwantedTags();
        return tagsForTootsList;
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

                const results = await zipPromiseCalls(
                    tags.map(tag => tag.name),
                    async (tagName) => {
                        return await MastoApi.instance.getStatusesForTag(
                            tagName,
                            this.logger,
                            this.config.numTootsPerTag
                        );
                    },
                    this.logger
                );

                return Object.values(results).flat();
            },
            this.cacheKey,
            this.config.maxToots,
        );
    };

    // Strip out tags we don't want to fetch toots for, e.g. followed, muted, invalid, or trending tags
    private async removeUnwantedTags(): Promise<void> {
        await this.tagList.removeMutedTags();
        await this.tagList.removeFollowedTags();
        this.tagList.removeInvalidTrendingTags();
        this.tagList.removeKeywords(this.config.invalidTags || []);

        if (this.cacheKey != TagTootsCacheKey.TRENDING_TAG_TOOTS) {
            const trendingTags = await MastodonServer.fediverseTrendingTags();
            this.tagList.removeKeywords(trendingTags.map(t => t.name));
        }
    }

    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags?: number): TagWithUsageCounts[] {
        numTags ||= this.config.numTags;
        const tags = truncateToConfiguredLength(this.tagList.topObjs(), numTags, this.logger);
        this.logger.debug(`topTags:\n`, tags.map((t, i) => `${i + 1}: ${tagInfoStr(t)}`).join("\n"));
        return tags;
    }

    // Return the tag lists used to search for toots (participated/trending/etc) in their raw unfiltered form
    static async rawTagLists(): Promise<Record<TagTootsCacheKey, TagList>> {
        const tagLists = await Promise.all([
            TagList.fromFavourites(),
            TagList.fromParticipated(),
            MastodonServer.fediverseTrendingTags(),
        ]);

        return {
            [TagTootsCacheKey.FAVOURITED_TAG_TOOTS]: tagLists[0],
            [TagTootsCacheKey.PARTICIPATED_TAG_TOOTS]: tagLists[1],
            [TagTootsCacheKey.TRENDING_TAG_TOOTS]: tagLists[2],
        };
    }
};
