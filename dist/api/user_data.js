"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("./objects/account"));
const api_1 = __importDefault(require("./api"));
const Storage_1 = __importDefault(require("../Storage"));
const types_1 = require("../types");
const tag_1 = require("./objects/tag");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const SORT_TAGS_BY = [
    "numToots",
    "name"
];
;
class UserData {
    favouritedTagCounts = {};
    followedAccounts = {}; // Don't store the Account objects, just webfingerURI to save memory
    followedTags = {};
    languagesPostedIn = {};
    mutedAccounts = {};
    participatedHashtags = {};
    preferredLanguage = config_1.Config.locale.defaultLanguage;
    serverSideFilters = [];
    // Alternate constructor to build UserData from raw API data
    static buildFromData(data) {
        const userData = new UserData();
        userData.favouritedTagCounts = (0, tag_1.countTags)(data.favouritedToots);
        userData.followedAccounts = account_1.default.countAccounts(data.followedAccounts);
        userData.followedTags = (0, tag_1.buildTagNames)(data.followedTags);
        userData.languagesPostedIn = (0, collection_helpers_1.countValues)(data.recentToots, (toot) => toot.language);
        userData.mutedAccounts = account_1.default.buildAccountNames(data.mutedAccounts);
        userData.participatedHashtags = UserData.buildUserParticipatedHashtags(data.recentToots);
        userData.preferredLanguage = (0, collection_helpers_1.sortKeysByValue)(userData.languagesPostedIn)[0] || config_1.Config.locale.defaultLanguage;
        userData.serverSideFilters = data.serverSideFilters;
        (0, log_helpers_1.traceLog)("[UserData] built from data:", userData);
        return userData;
    }
    // Alternate constructor for the UserData object to build itself from the API (or cache)
    static async getUserData() {
        const userData = new UserData();
        await userData.populate();
        return userData;
    }
    // Use MUTED_ACCOUNTS as a proxy for staleness
    // TODO: could be smarter
    async isDataStale() {
        return await Storage_1.default.isDataStale(types_1.CacheKey.MUTED_ACCOUNTS);
    }
    // Pull latest user's data from cache and/or API
    async populate() {
        const responses = await Promise.all([
            api_1.default.instance.getFavouritedToots(),
            api_1.default.instance.getFollowedAccounts(),
            api_1.default.instance.getFollowedTags(),
            api_1.default.instance.getMutedAccounts(),
            UserData.getUserParticipatedTags(),
            api_1.default.instance.getServerSideFilters(),
        ]);
        this.favouritedTagCounts = (0, tag_1.countTags)(responses[0]);
        this.followedAccounts = account_1.default.countAccounts(responses[1]);
        this.followedTags = (0, tag_1.buildTagNames)(responses[2]);
        this.mutedAccounts = account_1.default.buildAccountNames(responses[3]);
        this.participatedHashtags = responses[4];
        this.serverSideFilters = responses[5];
    }
    // Returns TrendingTags the user has participated in sorted by number of times they tooted it
    popularUserTags() {
        return UserData.sortTrendingTags(this.participatedHashtags);
    }
    ////////////////////////////
    //      Class Methods     //
    ////////////////////////////
    // Return an array of keywords the user has muted on the server side
    static async mutedKeywords() {
        const serverSideFilters = await api_1.default.instance.getServerSideFilters();
        let keywords = serverSideFilters.map(f => f.keywords.map(k => k.keyword)).flat().flat().flat();
        keywords = keywords.map(k => k.toLowerCase().replace(/^#/, ""));
        (0, log_helpers_1.traceLog)(`[mutedKeywords()] found ${keywords.length} keywords:`, keywords);
        return keywords;
    }
    // Fetch or load array of TrendingTags sorted by number of times the user tooted it
    static async getUserParticipatedHashtagsSorted() {
        const userTags = await UserData.getUserParticipatedTags();
        return this.sortTrendingTags(userTags);
    }
    // Fetch or load TrendingTag objects for the user's Toot history (tags the user has tooted)
    // The numToots prop is set to number of times user tooted it
    static async getUserParticipatedTags() {
        const recentToots = await api_1.default.instance.getRecentUserToots();
        return this.buildUserParticipatedHashtags(recentToots);
    }
    // Return array of TrendingTags sorted by numToots
    static sortTrendingTags(userTags) {
        return (0, collection_helpers_1.sortObjsByProps)(Object.values(userTags), SORT_TAGS_BY, [false, true]);
    }
    // Build a dict of tag names to the number of times the user tooted it from a list of toots
    static buildUserParticipatedHashtags(userToots) {
        // Ignores reblogs. Only counts toots authored by the user
        const tags = userToots.flatMap(toot => toot.tags || []);
        return tags.reduce((tags, tag) => {
            tags[tag.name] ??= tag;
            tags[tag.name].numToots = (tags[tag.name].numToots || 0) + 1;
            return tags;
        }, {});
    }
}
exports.default = UserData;
;
//# sourceMappingURL=user_data.js.map