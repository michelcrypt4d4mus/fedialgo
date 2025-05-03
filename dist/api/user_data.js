"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("./objects/account"));
const Storage_1 = __importDefault(require("../Storage"));
const types_1 = require("../types");
const api_1 = require("./api");
const collection_helpers_1 = require("../helpers/collection_helpers");
const SORT_TAGS_BY = ["numToots", "name"];
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
    // Alternate constructor to build a UserData object with data fetched from the API or cache
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
            api_1.MastoApi.instance.getFollowedAccounts(),
            api_1.MastoApi.instance.getFollowedTags(),
            api_1.MastoApi.instance.getMutedAccounts(),
            UserData.getPostedHashtags(),
            api_1.MastoApi.instance.getServerSideFilters(),
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
    // Strip functions from the object
    serialize() {
        return this;
    }
    ////////////////////////////
    //      Class Methods     //
    ////////////////////////////
    // Fetch or load array of TrendingTags sorted by number of times the user tooted it
    static async getPostedHashtagsSorted() {
        const userTags = await UserData.getPostedHashtags();
        return this.sortTagNames(userTags);
    }
    // Fetch or load TrendingTag objects with numToots prop set to number of times user tooted it
    static async getPostedHashtags() {
        const recentToots = await api_1.MastoApi.instance.getUserRecentToots();
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