import { mastodon } from "masto";
import Account from "./objects/account";
import { BooleanFilterOptionList, type ObjList } from "./counted_list";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { type AccountNames, type StringNumberDict, type TagWithUsageCounts } from "../types";
interface UserApiData {
    blockedDomains: string[];
    favouritedToots: Toot[];
    followedAccounts: Account[];
    followedTags: TagWithUsageCounts[];
    mutedAccounts: Account[];
    recentToots: Toot[];
    serverSideFilters: mastodon.v2.Filter[];
}
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
export default class UserData {
    blockedDomains: Set<string>;
    favouriteAccounts: BooleanFilterOptionList;
    favouritedTags: TagList;
    followedAccounts: StringNumberDict;
    followedTags: TagList;
    isRetooter: boolean;
    languagesPostedIn: ObjList;
    mutedAccounts: AccountNames;
    mutedKeywordsRegex: RegExp;
    participatedTags: TagList;
    preferredLanguage: string;
    serverSideFilters: mastodon.v2.Filter[];
    private lastUpdatedAt?;
    /**
     * Alternate constructor for the UserData object to build itself from the API (or cache).
     * @static
     * @returns {Promise<UserData>} UserData instance populated with the user's data.
     */
    static build(): Promise<UserData>;
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
    static buildFromData(data: UserApiData): UserData;
    /**
     * If there's newer data in the cache the data is not fresh.
     * @returns {Promise<boolean>} True if UserData object was created after the last updatedAt in Storage.
     */
    hasNewestApiData(): Promise<boolean>;
    /**
     * Add up the favourites, retoots, and replies for each account
     * @private
     * @param {UserApiData} data - The raw API data containing recent toots and favourited toots.
     */
    private populateFavouriteAccounts;
    /**
     * Get an array of keywords the user has muted on the server side
     * @returns {Promise<string[]>} An array of muted keywords.
     */
    static getMutedKeywords(): Promise<string[]>;
    /**
     * Build a regex that matches any of the user's muted keywords.
     * @returns {Promise<RegExp>} A RegExp that matches any of the user's muted keywords.
     */
    static getMutedKeywordsRegex(): Promise<RegExp>;
}
export {};
