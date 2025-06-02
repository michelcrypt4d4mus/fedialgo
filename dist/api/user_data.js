"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("./objects/account"));
const api_1 = __importDefault(require("./api"));
const most_favourited_accounts_scorer_1 = __importDefault(require("../scorer/feature/most_favourited_accounts_scorer"));
const most_retooted_accounts_scorer_1 = __importDefault(require("../scorer/feature/most_retooted_accounts_scorer"));
const Storage_1 = __importDefault(require("../Storage"));
const obj_with_counts_list_1 = __importDefault(require("./obj_with_counts_list"));
const tag_list_1 = __importDefault(require("./tag_list"));
const enums_1 = require("../enums");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const logger_1 = require("../helpers/logger");
const logger = new logger_1.Logger("UserData");
;
class UserData {
    favouriteAccounts = new obj_with_counts_list_1.default([], enums_1.ScoreName.FAVOURITED_ACCOUNTS);
    favouritedTags = new tag_list_1.default([], enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
    followedAccounts = {}; // Don't store the Account objects, just webfingerURI to save memory
    followedTags = new tag_list_1.default([], enums_1.ScoreName.FOLLOWED_TAGS);
    languagesPostedIn = {};
    mutedAccounts = {};
    participatedTags = new tag_list_1.default([], enums_1.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
    preferredLanguage = config_1.config.locale.defaultLanguage;
    serverSideFilters = []; // TODO: currently unused, only here for getCurrentState() by client app
    // Alternate constructor to build UserData from raw API data
    static buildFromData(data) {
        const userData = new UserData();
        userData.favouritedTags = tag_list_1.default.fromUsageCounts(data.favouritedToots, enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
        userData.followedAccounts = account_1.default.countAccounts(data.followedAccounts);
        userData.followedTags = new tag_list_1.default(data.followedTags, enums_1.ScoreName.FOLLOWED_TAGS);
        userData.languagesPostedIn = (0, collection_helpers_1.countValues)(data.recentToots, (toot) => toot.language);
        userData.mutedAccounts = account_1.default.buildAccountNames(data.mutedAccounts);
        userData.participatedTags = tag_list_1.default.fromUsageCounts(data.recentToots, enums_1.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
        userData.preferredLanguage = (0, collection_helpers_1.sortKeysByValue)(userData.languagesPostedIn)[0] || config_1.config.locale.defaultLanguage;
        userData.serverSideFilters = data.serverSideFilters;
        // Add up the favourites, retoots, and replies for each account
        // TODO: can't include replies yet bc we don't have the webfingerURI for those accounts, only inReplyToID
        const favouritedAccounts = most_favourited_accounts_scorer_1.default.buildFavouritedAccounts(data.favouritedToots);
        const retootedAccounts = most_retooted_accounts_scorer_1.default.buildRetootedAccounts(data.recentToots);
        // Fill in zeros for accounts that the user follows but has not favourited or retooted
        const followedAccountZeros = data.followedAccounts.reduce((zeros, account) => {
            zeros[account.webfingerURI] = 0;
            return zeros;
        }, {});
        const accountsDict = (0, collection_helpers_1.addDicts)(favouritedAccounts, followedAccountZeros, retootedAccounts);
        userData.favouriteAccounts = obj_with_counts_list_1.default.buildFromDict(accountsDict, enums_1.ScoreName.FAVOURITED_ACCOUNTS);
        logger.trace("Built from data:", userData);
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
        return await Storage_1.default.isDataStale(enums_1.CacheKey.MUTED_ACCOUNTS);
    }
    /////////////////////////////
    //      Static Methods     //
    /////////////////////////////
    // Return an array of keywords the user has muted on the server side
    static async getMutedKeywords() {
        const serverSideFilters = await api_1.default.instance.getServerSideFilters();
        let keywords = serverSideFilters.map(f => f.keywords.map(k => k.keyword)).flat().flat().flat();
        keywords = keywords.map(k => k.toLowerCase().replace(/^#/, ""));
        logger.trace(`<mutedKeywords()> found ${keywords.length} keywords:`, keywords);
        return keywords;
    }
}
exports.default = UserData;
;
//# sourceMappingURL=user_data.js.map