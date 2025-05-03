"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("./objects/account"));
const api_1 = __importDefault(require("./api"));
const Storage_1 = __importDefault(require("../Storage"));
const types_1 = require("../types");
const collection_helpers_1 = require("../helpers/collection_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const SORT_TAGS_BY = [
    "numToots",
    "name"
];
;
class UserData {
    followedAccounts;
    followedTags;
    mutedAccounts;
    participatedHashtags;
    serverSideFilters;
    // Alternate constructor to build UserData from raw API data
    static buildFromData(data) {
        const userData = new UserData();
        userData.followedAccounts = account_1.default.buildAccountNames(data.followedAccounts);
        userData.followedTags = data.followedTags;
        userData.mutedAccounts = account_1.default.buildAccountNames(data.mutedAccounts);
        userData.participatedHashtags = UserData.buildUserHashtags(data.recentToots);
        userData.serverSideFilters = data.serverSideFilters;
        return userData;
    }
    // Alternate constructor for the UserData object to build itself from the API (or cache)
    static async getUserData() {
        const userData = new UserData();
        await userData.populate();
        return userData;
    }
    // Builds an empty UserData object
    constructor() {
        this.followedAccounts = {};
        this.followedTags = [];
        this.mutedAccounts = {};
        this.participatedHashtags = {};
        this.serverSideFilters = [];
    }
    // Use MUTED_ACCOUNTS as a proxy for staleness
    // TODO: could be smarter
    async isDataStale() {
        return await Storage_1.default.isDataStale(types_1.StorageKey.MUTED_ACCOUNTS);
    }
    // Pull latest user's data from cache and/or API
    async populate() {
        const responses = await Promise.all([
            api_1.default.instance.getFollowedAccounts(),
            api_1.default.instance.getFollowedTags(),
            api_1.default.instance.getMutedAccounts(),
            UserData.getPostedHashtags(),
            api_1.default.instance.getServerSideFilters(),
        ]);
        this.followedAccounts = account_1.default.buildAccountNames(responses[0]);
        this.followedTags = responses[1];
        this.mutedAccounts = account_1.default.buildAccountNames(responses[2]);
        this.participatedHashtags = responses[3];
        this.serverSideFilters = responses[4];
    }
    // Returns TrendingTags the user has participated in sorted by number of times they tooted it
    popularUserTags() {
        return UserData.sortTagNames(this.participatedHashtags);
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
    static async getPostedHashtagsSorted() {
        const userTags = await UserData.getPostedHashtags();
        return this.sortTagNames(userTags);
    }
    // Fetch or load TrendingTag objects with numToots prop set to number of times user tooted it
    static async getPostedHashtags() {
        const recentToots = await api_1.default.instance.getUserRecentToots();
        return this.buildUserHashtags(recentToots);
    }
    // Return array of TrendingTags sorted by numToots
    static sortTagNames(userTags) {
        return (0, collection_helpers_1.sortObjsByProps)(Object.values(userTags), SORT_TAGS_BY, false);
    }
    // Build a dict of tag names to the number of times the user tooted it from a list of toots
    static buildUserHashtags(userToots) {
        const tags = userToots.flatMap(toot => (toot.reblog ?? toot).tags || []);
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