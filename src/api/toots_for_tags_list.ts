/*
 * Helper class for fetching toots for a list of tags, e.g. trending or particiapted tags.
 */
import MastoApi from "./api";
import Toot from "./objects/toot";
import TagList from "./tag_list";
import { config, TagTootsConfig } from "../config";
import { Logger } from '../helpers/logger';
import { tagStr } from "./objects/tag";
import { TagTootsCacheKey } from "../enums";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";
import { type TagWithUsageCounts } from "../types";

type TagTootsBuildConfig = {
    buildTagList: () => Promise<TagList>;
    config: TagTootsConfig;
    removeUnwantedTags: boolean;
};

const HASHTAG_TOOTS_CONFIG: Record<TagTootsCacheKey, TagTootsBuildConfig> = {
    [TagTootsCacheKey.FAVOURITED_TAG_TOOTS]: {
        buildTagList: async () => {
            const maxParticipations = config.favouritedTags.maxParticipations;  // TODO: a heuristic to decide this number?
            const participatedTags = (await TagList.fromParticipated()).tagNameDict();
            const tagList = await TagList.fromFavourites();
            // Remove tags that user uses often (we want only what they favourite, not what they participate in)
            return tagList.filter(t => (participatedTags[t.name]?.numToots || 0) <= maxParticipations);
        },
        config: config.favouritedTags,
        removeUnwantedTags: true,
    },
    [TagTootsCacheKey.PARTICIPATED_TAG_TOOTS]: {
        buildTagList: async () => await TagList.fromParticipated(),
        config: config.participatedTags,
        removeUnwantedTags: true,
    },
    [TagTootsCacheKey.TRENDING_TAG_TOOTS]: {
        buildTagList: async () => await TagList.fromTrending(),
        config: config.trending.tags,
        removeUnwantedTags: false,  // Trending tags are already filtered
    }
};


export default class TootsForTagsList {
    cacheKey: TagTootsCacheKey;
    config: TagTootsConfig;
    logger: Logger;
    tagList: TagList;

    // Alternate constructor
    static async create(cacheKey: TagTootsCacheKey): Promise<TootsForTagsList> {
        const tootsConfig = HASHTAG_TOOTS_CONFIG[cacheKey];
        const tagList = await tootsConfig.buildTagList();

        if (tootsConfig.removeUnwantedTags) {
            await this.removeUnwantedTags(tagList, tootsConfig.config);
        }

        return new TootsForTagsList(cacheKey, tagList, tootsConfig.config);
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
    static async getTootsFor(cacheKey: TagTootsCacheKey): Promise<Toot[]> {
        const tagList = await TootsForTagsList.create(cacheKey);
        return await tagList.getToots();
    }

    // Strip out tags we don't want to fetch toots for, e.g. followed, muted, invalid, or trending tags
    static async removeUnwantedTags(tagList: TagList, tootsConfig: TagTootsConfig): Promise<void> {
        await tagList.removeFollowedAndMutedTags();
        tagList.removeInvalidTrendingTags();
        tagList.removeKeywordsFromTags((await TagList.fromTrending()).tags.map(t => t.name)); // Remove trending tags
        tagList.removeKeywordsFromTags(tootsConfig.invalidTags || []);
    }
};
