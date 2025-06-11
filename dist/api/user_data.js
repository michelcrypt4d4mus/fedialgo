"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const account_1 = __importDefault(require("./objects/account"));
const api_1 = __importDefault(require("./api"));
const obj_with_counts_list_1 = __importStar(require("./obj_with_counts_list"));
const Storage_1 = __importDefault(require("../Storage"));
const tag_list_1 = __importDefault(require("./tag_list"));
const toot_1 = __importStar(require("./objects/toot"));
const enums_1 = require("../enums");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const language_helper_1 = require("../helpers/language_helper");
const logger_1 = require("../helpers/logger");
const logger = new logger_1.Logger("UserData");
;
/**
 * Represents background and scoring-related data about the current Fedialgo user.
 * Used as a central source of user context for scoring, filtering, and personalization.
 *
 * This class aggregates and manages user-related data such as favourited accounts, followed tags,
 * muted accounts, languages posted in, and server-side filters. It provides methods to build user data
 * from the Mastodon API or from raw API data, and supports updating, counting, and filtering operations
 * for use in scoring and filtering algorithms.
 *
 * @property {BooleanFilterOptionList} favouriteAccounts - Accounts the user has favourited, retooted, or replied to.
 * @property {TagList} favouritedTags - List of tags the user has favourited.
 * @property {StringNumberDict} followedAccounts - Dictionary of accounts the user follows, keyed by account name.
 * @property {TagList} followedTags - List of tags the user follows.
 * @property {ObjList} languagesPostedIn - List of languages the user has posted in, with usage counts.
 * @property {AccountNames} mutedAccounts - Dictionary of accounts the user has muted or blocked, keyed by Account["webfingerURI"].
 * @property {TagList} participatedTags - List of tags the user has participated in.
 * @property {string} preferredLanguage - The user's preferred language (ISO code).
 * @property {mastodon.v2.Filter[]} serverSideFilters - Array of server-side filters set by the user.
 */
class UserData {
    favouriteAccounts = new obj_with_counts_list_1.BooleanFilterOptionList([], enums_1.ScoreName.FAVOURITED_ACCOUNTS);
    favouritedTags = new tag_list_1.default([], enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
    followedAccounts = {};
    followedTags = new tag_list_1.default([], enums_1.ScoreName.FOLLOWED_TAGS);
    languagesPostedIn = new obj_with_counts_list_1.default([], enums_1.BooleanFilterName.LANGUAGE);
    mutedAccounts = {};
    participatedTags = new tag_list_1.default([], enums_1.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
    preferredLanguage = config_1.config.locale.defaultLanguage;
    serverSideFilters = []; // TODO: currently unused, only here for getCurrentState() by client app
    lastUpdatedAt;
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
    // Alternate constructor to build UserData from raw API data
    static buildFromData(data) {
        const userData = new UserData();
        userData.populateFavouriteAccounts(data);
        userData.favouritedTags = tag_list_1.default.fromUsageCounts(data.favouritedToots, enums_1.TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
        userData.followedAccounts = account_1.default.countAccounts(data.followedAccounts);
        userData.followedTags = new tag_list_1.default(data.followedTags, enums_1.ScoreName.FOLLOWED_TAGS);
        userData.mutedAccounts = account_1.default.buildAccountNames(data.mutedAccounts);
        userData.participatedTags = tag_list_1.default.fromUsageCounts(data.recentToots, enums_1.TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
        userData.serverSideFilters = data.serverSideFilters;
        userData.languagesPostedIn.populateByCountingProps(data.recentToots, tootLanguageOption);
        //Use the newest recent or favourited toot as proxy for freshness (other stuff rarely changes)
        userData.lastUpdatedAt = (0, toot_1.mostRecentTootedAt)([...data.recentToots, ...data.favouritedToots]);
        userData.preferredLanguage = userData.languagesPostedIn.topObjs()[0]?.name || config_1.config.locale.defaultLanguage;
        logger.trace("Built from data:", userData);
        return userData;
    }
    // If there's newer data in the cache the data is not fresh
    async hasNewestApiData() {
        return !!(Storage_1.default.lastUpdatedAt && this.lastUpdatedAt && (this.lastUpdatedAt >= Storage_1.default.lastUpdatedAt));
    }
    // Add up the favourites, retoots, and replies for each account
    populateFavouriteAccounts(data) {
        const retootsAndFaves = [...toot_1.default.onlyRetoots(data.recentToots), ...data.favouritedToots];
        const retootAndFaveAccounts = retootsAndFaves.map(t => t.author);
        const followedAccountIdMap = (0, collection_helpers_1.keyById)(data.followedAccounts);
        // TODO: Replies are imperfect, we only have inReplyToAccountId to work with. IDing ~1/3rd of the replies.
        // Currently that's only around 1/3rd of the replies.
        const replies = toot_1.default.onlyReplies(data.recentToots);
        const repliedToAccounts = replies.map(toot => followedAccountIdMap[toot.inReplyToAccountId]).filter(Boolean);
        logger.trace(`Found ${retootsAndFaves.length} retootsAndFaves, ${repliedToAccounts.length} replied toots' accounts (of ${replies.length} replies)`);
        const favouredAccounts = [...repliedToAccounts, ...retootAndFaveAccounts];
        this.favouriteAccounts.populateByCountingProps(favouredAccounts, account => account.asBooleanFilterOption);
        // Find the followed accounts that don't exist yet as options. Has side effect of mutating isFollowed property
        const optionsToAdd = data.followedAccounts.filter((account) => {
            const option = account.asBooleanFilterOption;
            const existingOption = this.favouriteAccounts.getObj(option.name);
            if (!option.isFollowed) {
                logger.warn("populateFavouriteAccounts() followed account is not marked as followed:", account);
                option.isFollowed = true;
            }
            if (existingOption) {
                existingOption.isFollowed = option.isFollowed;
                return false;
            }
            else {
                return true;
            }
        });
        this.favouriteAccounts.addObjs(optionsToAdd.map(account => account.asBooleanFilterOption));
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
// extract information for language BoooleanFilterOption
function tootLanguageOption(toot) {
    if (!toot.language) {
        logger.warn("Toot has no language set, using default language instead", toot);
        toot.language = config_1.config.locale.defaultLanguage;
    }
    return {
        displayName: (0, language_helper_1.languageName)(toot.language),
        name: toot.language
    };
}
;
//# sourceMappingURL=user_data.js.map