"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("./objects/account"));
const Storage_1 = __importDefault(require("../Storage"));
const collection_helpers_1 = require("../helpers/collection_helpers");
const api_1 = require("./api");
const types_1 = require("../types");
;
class UserData {
    followedAccounts;
    followedTags;
    mutedAccounts;
    participatedHashtags;
    serverSideFilters;
    static buildFromData(data) {
        const userData = new UserData();
        userData.followedAccounts = account_1.default.buildAccountNames(data.followedAccounts);
        userData.followedTags = data.followedTags;
        userData.mutedAccounts = account_1.default.buildAccountNames(data.mutedAccounts);
        userData.participatedHashtags = UserData.buildUserHashtags(data.recentToots);
        userData.serverSideFilters = data.serverSideFilters;
        return userData;
    }
    // Build a UserData object from the API and/or storage cache
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
    // Pull user's data from cache and/or API
    async populate() {
        const responses = await Promise.all([
            api_1.MastoApi.instance.getFollowedAccounts(),
            api_1.MastoApi.instance.getFollowedTags(),
            api_1.MastoApi.instance.getMutedAccounts(),
            UserData.getUsersHashtags(),
            api_1.MastoApi.instance.getServerSideFilters(),
        ]);
        this.followedAccounts = account_1.default.buildAccountNames(responses[0]);
        this.followedTags = responses[1];
        this.mutedAccounts = account_1.default.buildAccountNames(responses[2]);
        this.participatedHashtags = responses[3];
        this.serverSideFilters = responses[4];
        console.debug(`[UserData] Populated UserData object`);
    }
    // Use MUTED_ACCOUNTS as a proxy for staleness
    // TODO: could be smarter
    async isDataStale() {
        return await Storage_1.default.isDataStale(types_1.StorageKey.MUTED_ACCOUNTS);
    }
    // Strip functions from the object
    serialize() {
        return this;
    }
    // Returns tags the user has participated in sorted by number of times
    popularUserTags() {
        return UserData.sortTagNames(this.participatedHashtags);
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
    // Build TrendingTag objects with numToots prop set to number of times the user tooted it
    static async getUsersHashtags() {
        const recentToots = await api_1.MastoApi.instance.getUserRecentToots();
        return this.buildUserHashtags(recentToots);
    }
    // Return array of TrendingTags sorted by number of times the user tooted it
    static async sortedUsersHashtags() {
        const userTags = await UserData.getUsersHashtags();
        return this.sortTagNames(userTags);
    }
    // Return array of TrendingTags sorted by numToots
    static sortTagNames(userTags) {
        return (0, collection_helpers_1.sortObjsByProp)(Object.values(userTags), "numToots", false);
    }
}
exports.default = UserData;
;
//# sourceMappingURL=user_data.js.map