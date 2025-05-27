"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("./objects/account"));
const api_1 = __importDefault(require("./api"));
const Storage_1 = __importDefault(require("../Storage"));
const types_1 = require("../types");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const log_helpers_1 = require("../helpers/log_helpers");
const string_helpers_1 = require("../helpers/string_helpers");
const tag_list_1 = __importDefault(require("./objects/tag_list"));
;
class UserData {
    followedAccounts = {}; // Don't store the Account objects, just webfingerURI to save memory
    followedTags = {};
    languagesPostedIn = {};
    mutedAccounts = {};
    participatedHashtags = {};
    preferredLanguage = config_1.config.locale.defaultLanguage;
    serverSideFilters = [];
    // Alternate constructor to build UserData from raw API data
    static buildFromData(data) {
        const userData = new UserData();
        userData.followedAccounts = account_1.default.countAccounts(data.followedAccounts);
        userData.followedTags = new tag_list_1.default(data.followedTags).tagNameDict();
        userData.languagesPostedIn = (0, collection_helpers_1.countValues)(data.recentToots, (toot) => toot.language); // TODO: this is empty in the GUI?
        userData.mutedAccounts = account_1.default.buildAccountNames(data.mutedAccounts);
        userData.participatedHashtags = tag_list_1.default.fromUsageCounts(data.recentToots).tagNameDict();
        userData.preferredLanguage = (0, collection_helpers_1.sortKeysByValue)(userData.languagesPostedIn)[0] || config_1.config.locale.defaultLanguage;
        userData.serverSideFilters = data.serverSideFilters;
        (0, log_helpers_1.traceLog)("[UserData] built from data:", userData);
        return userData;
    }
    // Alternate constructor for the UserData object to build itself from the API (or cache)
    static async build() {
        const responses = await Promise.all([
            api_1.default.instance.getFavouritedToots(),
            api_1.default.instance.getFollowedAccounts(),
            api_1.default.instance.getFollowedTags(),
            api_1.default.instance.getMutedAccounts(),
            api_1.default.instance.getRecentUserToots(),
            api_1.default.instance.getServerSideFilters(),
        ]);
        return this.buildFromData({
            favouritedToots: responses[0],
            followedAccounts: responses[1],
            followedTags: responses[2],
            mutedAccounts: responses[3],
            recentToots: responses[4],
            serverSideFilters: responses[5],
        });
    }
    // Use MUTED_ACCOUNTS as a proxy for staleness
    // TODO: could be smarter
    async isDataStale() {
        return await Storage_1.default.isDataStale(types_1.CacheKey.MUTED_ACCOUNTS);
    }
    // Returns TrendingTags the user has participated in sorted by number of times they tooted it
    popularUserTags() {
        return (new tag_list_1.default(Object.values(this.participatedHashtags))).topTags();
    }
    /////////////////////////////
    //      Static Methods     //
    /////////////////////////////
    // Return an array of keywords the user has muted on the server side
    static async getMutedKeywords() {
        const serverSideFilters = await api_1.default.instance.getServerSideFilters();
        let keywords = serverSideFilters.map(f => f.keywords.map(k => k.keyword)).flat().flat().flat();
        keywords = keywords.map(k => k.toLowerCase().replace(/^#/, ""));
        (0, log_helpers_1.traceLog)(`[mutedKeywords()] found ${keywords.length} keywords:`, keywords);
        return keywords;
    }
    // Fetch or load TrendingTag objects for the user's Toot history (tags the user has tooted)
    // The numToots prop is set to number of times user tooted it
    static async getUserParticipatedTags() {
        const recentToots = await api_1.default.instance.getRecentUserToots();
        return this.buildUserParticipatedHashtags(recentToots);
    }
    // Build a dict of tag names to the number of times the user tooted it from a list of toots
    static buildUserParticipatedHashtags(userToots) {
        // Ignores reblogs. Only counts toots authored by the user
        const tags = userToots.flatMap(toot => toot.tags || []);
        return tags.reduce((tags, tag) => {
            tags[tag.name] ??= tag;
            tags[tag.name].numToots = (tags[tag.name].numToots || 0) + 1;
            tags[tag.name].regex = (0, string_helpers_1.wordRegex)(tag.name);
            return tags;
        }, {});
    }
}
exports.default = UserData;
;
//# sourceMappingURL=user_data.js.map