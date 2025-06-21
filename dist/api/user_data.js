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
const counted_list_1 = __importStar(require("./counted_list"));
const Storage_1 = __importDefault(require("../Storage"));
const tag_list_1 = __importDefault(require("./tag_list"));
const toot_1 = __importStar(require("./objects/toot"));
const enums_1 = require("../enums");
const filter_1 = require("./objects/filter");
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
 * @property {Set<string>} blockedDomains - Set of domains the user has blocked.
 * @property {BooleanFilterOptionList} favouriteAccounts - Accounts the user has favourited, retooted, or replied to.
 * @property {TagList} favouritedTags - List of tags the user has favourited.
 * @property {StringNumberDict} followedAccounts - Dictionary of accounts the user follows, keyed by account name.
 * @property {TagList} followedTags - List of tags the user follows.
 * @property {boolean} isRetooter - True if the user is primarily a retooter (retootPct above configured threshold).
 * @property {ObjList} languagesPostedIn - List of languages the user has posted in, with usage counts.
 * @property {Record<string, Account>} mutedAccounts - Dictionary of accounts the user has muted or blocked, keyed by Account["webfingerURI"].
 * @property {RegExp} mutedKeywordsRegex - Cached regex for muted keywords, built from server-side filters.
 * @property {TagList} participatedTags - List of tags the user has participated in.
 * @property {string} preferredLanguage - The user's preferred language (ISO code).
 * @property {mastodon.v2.Filter[]} serverSideFilters - Array of server-side filters set by the user.
 */
class UserData {
    blockedDomains = new Set();
    favouriteAccounts = new counted_list_1.BooleanFilterOptionList([], enums_1.ScoreName.FAVOURITED_ACCOUNTS);
    favouritedTags = new tag_list_1.default([], enums_1.TagTootsCategory.FAVOURITED);
    followedAccounts = {};
    followedTags = new tag_list_1.default([], enums_1.ScoreName.FOLLOWED_TAGS);
    isRetooter = false;
    languagesPostedIn = new counted_list_1.default([], enums_1.BooleanFilterName.LANGUAGE);
    mutedAccounts = {};
    mutedKeywordsRegex; // Cached regex for muted keywords, built from server-side filters
    participatedTags = new tag_list_1.default([], enums_1.TagTootsCategory.PARTICIPATED);
    preferredLanguage = config_1.config.locale.defaultLanguage;
    serverSideFilters = [];
    lastUpdatedAt;
    /**
     * Alternate constructor for the UserData object to build itself from the API (or cache).
     * @static
     * @returns {Promise<UserData>} UserData instance populated with the user's data.
     */
    static async build() {
        const responses = await (0, collection_helpers_1.resolvePromiseDict)({
            blockedDomains: api_1.default.instance.getBlockedDomains(),
            favouritedToots: api_1.default.instance.getFavouritedToots(),
            followedAccounts: api_1.default.instance.getFollowedAccounts(),
            followedTags: api_1.default.instance.getFollowedTags(),
            mutedAccounts: api_1.default.instance.getMutedAccounts(),
            recentToots: api_1.default.instance.getRecentUserToots(),
            serverSideFilters: api_1.default.instance.getServerSideFilters(),
        }, logger, []);
        return this.buildFromData(responses);
    }
    /**
     * Alternate constructor to build UserData from API data.
     * @static
     * @param {UserApiData} data - The raw API data to build the UserData from.
     * @param {string[]} data.blockedDomains - Domains the user has blocked.
     * @param {Toot[]} data.favouritedToots - Toots the user has favourited.
     * @param {Account[]} data.followedAccounts - Accounts the user follows.
     * @param {TagWithUsageCounts[]} data.followedTags - Tags the user follows, with usage counts.
     * @param {Account[]} data.mutedAccounts - Accounts the user has muted.
     * @param {Toot[]} data.recentToots - Recent toots by the user.*
     * @param {mastodon.v2.Filter[]} data.serverSideFilters - Server-side filters set by the user.
     * @returns {UserData} A new UserData instance populated with the provided data.
     */
    static buildFromData(data) {
        const userData = new UserData();
        if (data.recentToots.length) {
            const retootsPct = toot_1.default.onlyRetoots(data.recentToots).length / data.recentToots.length;
            userData.isRetooter = (retootsPct > config_1.config.participatedTags.minPctToCountRetoots);
        }
        userData.blockedDomains = new Set(data.blockedDomains);
        userData.favouritedTags = tag_list_1.default.fromUsageCounts(data.favouritedToots, enums_1.TagTootsCategory.FAVOURITED);
        userData.followedAccounts = account_1.default.countAccounts(data.followedAccounts);
        userData.followedTags = new tag_list_1.default(data.followedTags, enums_1.ScoreName.FOLLOWED_TAGS);
        userData.mutedAccounts = account_1.default.buildAccountNames(data.mutedAccounts);
        userData.mutedKeywordsRegex = (0, filter_1.buildMutedRegex)(data.serverSideFilters);
        userData.participatedTags = tag_list_1.default.fromParticipations(data.recentToots, userData.isRetooter);
        userData.serverSideFilters = data.serverSideFilters;
        userData.languagesPostedIn.populateByCountingProps(data.recentToots, tootLanguageOption);
        userData.populateFavouriteAccounts(data);
        // Use the newest recent or favourited toot as proxy for freshness (other stuff rarely changes)
        userData.lastUpdatedAt = (0, toot_1.mostRecentTootedAt)([...data.recentToots, ...data.favouritedToots]);
        userData.preferredLanguage = userData.languagesPostedIn.topObjs()[0]?.name || config_1.config.locale.defaultLanguage;
        logger.trace("Built from data:", userData);
        return userData;
    }
    /**
     * If there's newer data in the cache the data is not fresh.
     * @returns {Promise<boolean>} True if UserData object was created after the last updatedAt in Storage.
     */
    async hasNewestApiData() {
        const isUpToDate = !!(Storage_1.default.lastUpdatedAt && this.lastUpdatedAt && (this.lastUpdatedAt >= Storage_1.default.lastUpdatedAt));
        logger.debug(`hasNewestApiData() lastUpdatedAt: ${this.lastUpdatedAt}, Storage.lastUpdatedAt: ${Storage_1.default.lastUpdatedAt}, isUpToDate: ${isUpToDate}`);
        return isUpToDate;
    }
    /**
     * Add up the favourites, retoots, and replies for each account
     * @private
     * @param {UserApiData} data - The raw API data containing recent toots and favourited toots.
     */
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
    /**
     * Get an array of keywords the user has muted on the server side
     * @returns {Promise<string[]>} An array of muted keywords.
     */
    static async getMutedKeywords() {
        return (0, filter_1.extractMutedKeywords)(await api_1.default.instance.getServerSideFilters());
    }
    /**
     * Build a regex that matches any of the user's muted keywords.
     * @returns {Promise<RegExp>} A RegExp that matches any of the user's muted keywords.
     */
    static async getMutedKeywordsRegex() {
        return (0, filter_1.buildMutedRegex)(await api_1.default.instance.getServerSideFilters());
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