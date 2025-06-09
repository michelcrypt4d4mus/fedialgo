import { mastodon } from "masto";
import Account from "./objects/account";
import { BooleanFilterOptionList, ObjList } from "./obj_with_counts_list";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { type AccountNames, type StringNumberDict, type TagWithUsageCounts } from "../types";
interface UserApiData {
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
 * Properties:
 * @property {BooleanFilterOptionList} favouriteAccounts - Accounts the user has favourited, retooted, or replied to.
 * @property {TagList} favouritedTags - List of tags the user has favourited.
 * @property {StringNumberDict} followedAccounts - Dictionary of accounts the user follows, keyed by account name.
 * @property {TagList} followedTags - List of tags the user follows.
 * @property {ObjList} languagesPostedIn - List of languages the user has posted in, with usage counts.
 * @property {AccountNames} mutedAccounts - Dictionary of accounts the user has muted, keyed by account name.
 * @property {TagList} participatedTags - List of tags the user has participated in.
 * @property {string} preferredLanguage - The user's preferred language (ISO code).
 * @property {mastodon.v2.Filter[]} serverSideFilters - Array of server-side filters set by the user (currently unused).
 */
export default class UserData {
    favouriteAccounts: BooleanFilterOptionList;
    favouritedTags: TagList;
    followedAccounts: StringNumberDict;
    followedTags: TagList;
    languagesPostedIn: ObjList;
    mutedAccounts: AccountNames;
    participatedTags: TagList;
    preferredLanguage: string;
    serverSideFilters: mastodon.v2.Filter[];
    private lastUpdatedAt?;
    static build(): Promise<UserData>;
    static buildFromData(data: UserApiData): UserData;
    hasNewestApiData(): Promise<boolean>;
    private populateFavouriteAccounts;
    static getMutedKeywords(): Promise<string[]>;
}
export {};
