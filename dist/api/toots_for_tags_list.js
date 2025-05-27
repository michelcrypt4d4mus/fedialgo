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
const types_1 = require("../types");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
class TootsForTagsList {
    cacheKey;
    tagList;
    tootsConfig;
    // Alternate constructor
    static async create(cacheKey) {
        let tootsConfig;
        let tagList;
        if (cacheKey === types_1.CacheKey.FAVOURITED_HASHTAG_TOOTS) {
            tootsConfig = config_1.config.favouritedTags;
            tagList = await tag_list_1.default.fromFavourites();
            await tagList.removeFollowedAndMutedTags();
            await tagList.removeTrendingTags();
            tagList.removeInvalidTrendingTags();
        }
        else if (cacheKey === types_1.CacheKey.PARTICIPATED_TAG_TOOTS) {
            tootsConfig = config_1.config.participatedTags;
            tagList = await tag_list_1.default.fromParticipated();
            await tagList.removeFollowedAndMutedTags();
            await tagList.removeTrendingTags();
        }
        else if (cacheKey === types_1.CacheKey.TRENDING_TAG_TOOTS) {
            tootsConfig = config_1.config.trending.tags;
            tagList = await tag_list_1.default.fromTrending();
        }
        else {
            throw new Error(`TootsForTagsList: Invalid cacheKey ${cacheKey}`);
        }
        return new TootsForTagsList(cacheKey, tagList, tootsConfig);
    }
    // Create then immediately fetch toots for the tags
    static async getTootsForTags(cacheKey) {
        const tagList = await TootsForTagsList.create(cacheKey);
        return await tagList.getToots();
    }
    constructor(cacheKey, tagList, tootsConfig) {
        this.tagList = tagList;
        this.cacheKey = cacheKey;
        this.tootsConfig = tootsConfig;
    }
    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags) {
        numTags ||= this.tootsConfig.numTags;
        return (0, collection_helpers_1.truncateToConfiguredLength)(this.tagList.topTags(), numTags, this.cacheKey);
    }
    // Get toots for the list of tags, caching the results
    async getToots() {
        return await api_1.default.instance.getCacheableToots(async () => await api_1.default.instance.getStatusesForTags(this.topTags(), this.tootsConfig.numTootsPerTag), this.cacheKey, this.tootsConfig.maxToots);
    }
    ;
}
exports.default = TootsForTagsList;
;
//# sourceMappingURL=toots_for_tags_list.js.map