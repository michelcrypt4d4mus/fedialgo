"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("./objects/account"));
// import BooleanFilterOptionList from "../filters/boolean_filter_option_list";
const api_1 = __importDefault(require("./api"));
// import MostFavouritedAccountsScorer from "../scorer/feature/most_favourited_accounts_scorer";
// import MostRetootedAccountsScorer from "../scorer/feature/most_retooted_accounts_scorer";
const obj_with_counts_list_1 = __importDefault(require("./obj_with_counts_list"));
const Storage_1 = __importDefault(require("../Storage"));
const tag_list_1 = __importDefault(require("./tag_list"));
const toot_1 = __importDefault(require("./objects/toot"));
const enums_1 = require("../enums");
const enums_2 = require("../enums");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const logger_1 = require("../helpers/logger");
const logger = new logger_1.Logger("UserData");
;
class UserData {
    // numToots in favouriteAccounts is the sum of retoots, favourites, and replies to that account
    favouriteAccounts = new obj_with_counts_list_1.default([], enums_2.ScoreName.FAVOURITED_ACCOUNTS);
    favouritedTags = new tag_list_1.default([], enums_2.TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
    followedAccounts = {};
    followedTags = new tag_list_1.default([], enums_2.ScoreName.FOLLOWED_TAGS);
    languagesPostedIn = new obj_with_counts_list_1.default([], enums_1.BooleanFilterName.LANGUAGE);
    mutedAccounts = {};
    participatedTags = new tag_list_1.default([], enums_2.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
    preferredLanguage = config_1.config.locale.defaultLanguage;
    serverSideFilters = []; // TODO: currently unused, only here for getCurrentState() by client app
    // Alternate constructor to build UserData from raw API data
    static buildFromData(data) {
        const userData = new UserData();
        userData.favouriteAccounts = this.buildFavouriteAccount(data);
        userData.favouritedTags = tag_list_1.default.fromUsageCounts(data.favouritedToots, enums_2.TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
        userData.followedAccounts = account_1.default.countAccounts(data.followedAccounts);
        userData.followedTags = new tag_list_1.default(data.followedTags, enums_2.ScoreName.FOLLOWED_TAGS);
        userData.mutedAccounts = account_1.default.buildAccountNames(data.mutedAccounts);
        userData.participatedTags = tag_list_1.default.fromUsageCounts(data.recentToots, enums_2.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
        userData.serverSideFilters = data.serverSideFilters;
        // Language stuff
        userData.languagesPostedIn = obj_with_counts_list_1.default.buildByCountingObjProps(data.recentToots, (toot) => toot.language, enums_1.BooleanFilterName.LANGUAGE);
        userData.preferredLanguage = userData.languagesPostedIn.topObjs()[0]?.name || config_1.config.locale.defaultLanguage;
        logger.trace("Built from data:", userData);
        return userData;
    }
    // Add up the favourites, retoots, and replies for each account
    static buildFavouriteAccount(data) {
        const retootsAndFaves = [...toot_1.default.onlyRetoots(data.recentToots), ...data.favouritedToots];
        const retootAndFaveAccounts = retootsAndFaves.map(t => t.account);
        const followedAccountIdMap = (0, collection_helpers_1.keyById)(data.followedAccounts);
        // TODO: Replies are imperfect - we're only checking followed accts bc we only have account ID to work with
        const replies = toot_1.default.onlyReplies(data.recentToots);
        const repliedToAccounts = replies.map(toot => followedAccountIdMap[toot.inReplyToAccountId]).filter(Boolean);
        logger.trace(`Found ${repliedToAccounts.length} replied toots' accounts (of ${replies.length} replies)`);
        const accountCounts = account_1.default.countAccountsWithObj([...repliedToAccounts, ...retootAndFaveAccounts]);
        // Fill in zeros in accountCounts for accounts that the user follows but has not favourited or retooted
        data.followedAccounts.forEach((account) => {
            accountCounts[account.webfingerURI] ??= { account, count: 0 };
            accountCounts[account.webfingerURI].isFollowed = true;
        });
        const accountOptions = Object.values(accountCounts).map(accountCount => {
            const option = {
                displayName: accountCount.account.displayName,
                displayNameWithEmoji: accountCount.account.displayNameWithEmojis(),
                isFollowed: accountCount.isFollowed,
                name: accountCount.account.webfingerURI,
                numToots: accountCount.count,
            };
            return option;
        });
        return new obj_with_counts_list_1.default(accountOptions, enums_2.ScoreName.FAVOURITED_ACCOUNTS);
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
        return await Storage_1.default.isDataStale(enums_2.CacheKey.MUTED_ACCOUNTS);
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