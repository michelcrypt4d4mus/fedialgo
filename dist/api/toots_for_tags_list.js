"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Helper class for fetching toots for a list of tags, e.g. trending or particiapted tags.
 */
const api_1 = __importDefault(require("./api"));
const tag_list_1 = __importDefault(require("./tag_list"));
const enums_1 = require("../enums");
const config_1 = require("../config");
const logger_1 = require("../helpers/logger");
const tag_1 = require("./objects/tag");
const collection_helpers_1 = require("../helpers/collection_helpers");
class TootsForTagsList {
    cacheKey;
    logger;
    tagList;
    tootsConfig;
    // Alternate constructor
    static async create(cacheKey) {
        let tootsConfig;
        let tagList;
        if (cacheKey === enums_1.CacheKey.FAVOURITED_HASHTAG_TOOTS) {
            tootsConfig = config_1.config.favouritedTags;
            tagList = await tag_list_1.default.fromFavourites();
            await this.removeUnwantedTags(tagList, tootsConfig);
            // Remove tags that have been used in 2 or more toots by the user
            // TODO: use a configured value or a heuristic instead of hardcoded 2
            const participatedTags = (await tag_list_1.default.fromParticipated()).tagNameDict();
            tagList.tags = tagList.tags.filter((tag) => (participatedTags[tag.name]?.numToots || 0) <= 3);
        }
        else if (cacheKey === enums_1.CacheKey.PARTICIPATED_TAG_TOOTS) {
            tootsConfig = config_1.config.participatedTags;
            tagList = await tag_list_1.default.fromParticipated();
            await this.removeUnwantedTags(tagList, tootsConfig);
        }
        else if (cacheKey === enums_1.CacheKey.TRENDING_TAG_TOOTS) {
            tootsConfig = config_1.config.trending.tags;
            tagList = await tag_list_1.default.fromTrending();
        }
        else {
            throw new Error(`TootsForTagsList: Invalid cacheKey ${cacheKey}`);
        }
        return new TootsForTagsList(cacheKey, tagList, tootsConfig);
    }
    constructor(cacheKey, tagList, tootsConfig) {
        this.cacheKey = cacheKey;
        this.logger = new logger_1.Logger(cacheKey);
        this.tagList = tagList;
        this.tootsConfig = tootsConfig;
    }
    // Get toots for the list of tags, caching the results
    async getToots() {
        return await api_1.default.instance.getCacheableToots(async () => {
            const tags = this.topTags();
            this.logger.log(`getToots() called for ${tags.length} tags:`, tags.map(t => t.name));
            const tagToots = await Promise.all(tags.map(async (tag) => {
                return await api_1.default.instance.getStatusesForTag(tag, this.logger, this.tootsConfig.numTootsPerTag);
            }));
            return tagToots.flat();
        }, this.cacheKey, this.tootsConfig.maxToots);
    }
    ;
    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags) {
        numTags ||= this.tootsConfig.numTags;
        const tags = (0, collection_helpers_1.truncateToConfiguredLength)(this.tagList.topTags(), numTags, this.logger);
        this.logger.debug(`topTags:\n`, tags.map((t, i) => `${i + 1}: ${(0, tag_1.tagStr)(t)}`).join("\n"));
        return tags;
    }
    // Create then immediately fetch toots for the tags
    static async getToots(cacheKey) {
        const tagList = await TootsForTagsList.create(cacheKey);
        return await tagList.getToots();
    }
    static async removeUnwantedTags(tagList, tootsConfig) {
        await tagList.removeFollowedAndMutedTags();
        tagList.removeInvalidTrendingTags();
        tagList.removeKeywordsFromTags((await tag_list_1.default.fromTrending()).tags.map(t => t.name)); // Remove trending tags
        tagList.removeKeywordsFromTags(tootsConfig.invalidTags || []);
    }
}
exports.default = TootsForTagsList;
;
//# sourceMappingURL=toots_for_tags_list.js.map