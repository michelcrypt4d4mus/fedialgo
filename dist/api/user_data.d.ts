import { mastodon } from "masto";
import Account from "./objects/account";
import { BooleanFilterOptionList, ObjList } from "./obj_with_counts_list";
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
    languagesPostedIn: ObjList;
    mutedAccounts: AccountNames;
    mutedKeywordsRegex: RegExp;
    participatedTags: TagList;
    preferredLanguage: string;
    serverSideFilters: mastodon.v2.Filter[];
    private lastUpdatedAt?;
    static build(): Promise<UserData>;
    static buildFromData(data: UserApiData): UserData;
    hasNewestApiData(): Promise<boolean>;
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
