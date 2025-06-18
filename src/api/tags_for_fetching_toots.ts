/*
 * Helper class for fetching toots for a list of tags, e.g. trending or particiapted tags.
 */
import MastoApi from "./api";
import MastodonServer from "./mastodon_server";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { config, type TagTootsConfig } from "../config";
import { Logger } from '../helpers/logger';
import { resolvePromiseDict, truncateToLength, zipPromiseCalls } from "../helpers/collection_helpers";
import { tagInfoStr } from "./objects/tag";
import { TagTootsType } from "../enums";
import { type TagWithUsageCounts } from "../types";

type TagTootsBuildConfig = {
    buildTagList: () => Promise<TagList>;
    config: TagTootsConfig;
};

const HASHTAG_TOOTS_CONFIG: Record<TagTootsType, TagTootsBuildConfig> = {
    [TagTootsType.FAVOURITED]: {
        buildTagList: async () => {
            const tagList = await TagList.buildFavouritedTags();
            // Remove tags that user uses often (we want only what they favourite, not what they participate in)
            const participatedTags = await TagList.buildParticipatedTags();
            const maxParticipations = config.favouritedTags.maxParticipations;  // TODO: use heuristic to pick this number?
            return tagList.filter(tag => (participatedTags.getTag(tag)?.numToots || 0) <= maxParticipations);
        },
        config: config.favouritedTags,
    },
    [TagTootsType.PARTICIPATED]: {
        buildTagList: async () => await TagList.buildParticipatedTags(),  // TODO: why do I have to define an anonymous fxn for this to work?
        config: config.participatedTags,
    },
    [TagTootsType.TRENDING]: {
        buildTagList: async () => await MastodonServer.fediverseTrendingTags(),
        config: config.trending.tags,
    }
};


export default class TagsForFetchingToots {
    cacheKey: TagTootsType;
    config: TagTootsConfig;
    logger: Logger;
    tagList: TagList;

    /** Alternate async constructor. */
    static async create(cacheKey: TagTootsType): Promise<TagsForFetchingToots> {
        const tootsConfig = HASHTAG_TOOTS_CONFIG[cacheKey];
        const tagList = await tootsConfig.buildTagList();
        const tagsForTootsList = new TagsForFetchingToots(cacheKey, tootsConfig.config, tagList);
        await tagsForTootsList.removeUnwantedTags();
        return tagsForTootsList;
    }

    private constructor(cacheKey: TagTootsType, tagsConfig: TagTootsConfig, tagList: TagList) {
        this.cacheKey = cacheKey;
        this.config = tagsConfig;
        this.tagList = tagList;
        this.logger = new Logger(cacheKey);
    }

    /** Get toots for the list of tags, caching the results. */
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

    /** Strip out tags we don't want to fetch toots for, e.g. followed, muted, invalid, or trending tags. */
    private async removeUnwantedTags(): Promise<void> {
        await this.tagList.removeFollowedTags();
        await this.tagList.removeInvalidTrendingTags();
        this.tagList.removeKeywords(this.config.invalidTags || []);

        if (this.cacheKey != TagTootsType.TRENDING) {
            const trendingTags = await MastodonServer.fediverseTrendingTags();
            this.tagList.removeKeywords(trendingTags.map(t => t.name));
        }
    }

    /** Return numTags tags sorted by numToots then by name (return all if numTags is not set). */
    topTags(numTags?: number): TagWithUsageCounts[] {
        numTags ||= this.config.numTags;
        const tags = truncateToLength(this.tagList.topObjs(), numTags, this.logger);
        this.logger.debug(`topTags:\n`, tags.map((t, i) => `${i + 1}: ${tagInfoStr(t)}`).join("\n"));
        return tags;
    }

    /** Return the tag lists used to search for toots (participated/trending/etc) in their raw unfiltered form. */
    static async rawTagLists(): Promise<Record<TagTootsType, TagList>> {
        return await resolvePromiseDict(
            {
                [TagTootsType.FAVOURITED]: TagList.buildFavouritedTags(),
                [TagTootsType.PARTICIPATED]: TagList.buildParticipatedTags(),
                [TagTootsType.TRENDING]: MastodonServer.fediverseTrendingTags(),
            },
            new Logger("TagsForFetchingToots.rawTagLists()"),
            (failedKey: TagTootsType) => new TagList([], failedKey)
        );
    }
};
