"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Helper class for fetching toots for a list of tags, e.g. trending or particiapted tags.
 */
const api_1 = __importDefault(require("./api"));
const mastodon_server_1 = __importDefault(require("./mastodon_server"));
const tag_list_1 = __importDefault(require("./tag_list"));
const config_1 = require("../config");
const logger_1 = require("../helpers/logger");
const collection_helpers_1 = require("../helpers/collection_helpers");
const tag_1 = require("./objects/tag");
const enums_1 = require("../enums");
const HASHTAG_TOOTS_CONFIG = {
    [enums_1.TagTootsCategory.FAVOURITED]: {
        buildTagList: async () => {
            const tagList = await tag_list_1.default.buildFavouritedTags();
            // Remove tags that user uses often (we want only what they favourite, not what they participate in)
            const participatedTags = await tag_list_1.default.buildParticipatedTags();
            const maxParticipations = config_1.config.favouritedTags.maxParticipations; // TODO: use heuristic to pick this number?
            return tagList.filter(tag => (participatedTags.getTag(tag)?.numToots || 0) <= maxParticipations);
        },
        config: config_1.config.favouritedTags,
    },
    [enums_1.TagTootsCategory.PARTICIPATED]: {
        buildTagList: async () => await tag_list_1.default.buildParticipatedTags(),
        config: config_1.config.participatedTags,
    },
    [enums_1.TagTootsCategory.TRENDING]: {
        buildTagList: async () => await mastodon_server_1.default.fediverseTrendingTags(),
        config: config_1.config.trending.tags,
    }
};
class TagsForFetchingToots {
    cacheKey;
    config;
    logger;
    tagList;
    /** Alternate async constructor. */
    static async create(cacheKey) {
        const tootsConfig = HASHTAG_TOOTS_CONFIG[cacheKey];
        const tagList = await tootsConfig.buildTagList();
        const tagsForTootsList = new TagsForFetchingToots(cacheKey, tootsConfig.config, tagList);
        await tagsForTootsList.removeUnwantedTags();
        return tagsForTootsList;
    }
    constructor(cacheKey, tagsConfig, tagList) {
        this.cacheKey = cacheKey;
        this.config = tagsConfig;
        this.tagList = tagList;
        this.logger = new logger_1.Logger(cacheKey);
    }
    /** Get toots for the list of tags, caching the results. */
    async getToots() {
        return await api_1.default.instance.getCacheableToots(async () => {
            const tags = this.topTags();
            this.logger.log(`getToots() called for ${tags.length} tags:`, tags.map(t => t.name));
            const results = await (0, collection_helpers_1.zipPromiseCalls)(tags.map(tag => tag.name), async (tagName) => {
                return await api_1.default.instance.getStatusesForTag(tagName, this.logger, this.config.numTootsPerTag);
            }, this.logger);
            return Object.values(results).flat();
        }, this.cacheKey, this.config.maxToots);
    }
    ;
    /** Strip out tags we don't want to fetch toots for, e.g. followed, muted, invalid, or trending tags. */
    async removeUnwantedTags() {
        await this.tagList.removeFollowedTags();
        await this.tagList.removeInvalidTrendingTags();
        this.tagList.removeKeywords(this.config.invalidTags || []);
        if (this.cacheKey != enums_1.TagTootsCategory.TRENDING) {
            const trendingTags = await mastodon_server_1.default.fediverseTrendingTags();
            this.tagList.removeKeywords(trendingTags.map(t => t.name));
        }
    }
    /** Return numTags tags sorted by numToots then by name (return all if numTags is not set). */
    topTags(numTags) {
        numTags ||= this.config.numTags;
        const tags = (0, collection_helpers_1.truncateToLength)(this.tagList.topObjs(), numTags, this.logger);
        this.logger.debug(`topTags:\n`, tags.map((t, i) => `${i + 1}: ${(0, tag_1.tagInfoStr)(t)}`).join("\n"));
        return tags;
    }
    /** Return the tag lists used to search for toots (participated/trending/etc) in their raw unfiltered form. */
    static async rawTagLists() {
        return await (0, collection_helpers_1.resolvePromiseDict)({
            [enums_1.TagTootsCategory.FAVOURITED]: tag_list_1.default.buildFavouritedTags(),
            [enums_1.TagTootsCategory.PARTICIPATED]: tag_list_1.default.buildParticipatedTags(),
            [enums_1.TagTootsCategory.TRENDING]: mastodon_server_1.default.fediverseTrendingTags(),
        }, new logger_1.Logger("TagsForFetchingToots.rawTagLists()"), (failedKey) => new tag_list_1.default([], failedKey));
    }
}
exports.default = TagsForFetchingToots;
;
//# sourceMappingURL=tags_for_fetching_toots.js.map