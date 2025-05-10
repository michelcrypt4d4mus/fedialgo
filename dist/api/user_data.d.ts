import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from "./objects/toot";
import { AccountNames, StringNumberDict, TagNames, TagWithUsageCounts } from "../types";
interface UserApiData {
    followedAccounts: Account[];
    followedTags: TagWithUsageCounts[];
    mutedAccounts: Account[];
    recentToots: Toot[];
    serverSideFilters: mastodon.v2.Filter[];
}
export default class UserData {
    followedAccounts: StringNumberDict;
    followedTags: TagNames;
    languagesPostedIn: StringNumberDict;
    mutedAccounts: AccountNames;
    participatedHashtags: TagNames;
    preferredLanguage: string;
    serverSideFilters: mastodon.v2.Filter[];
    static buildFromData(data: UserApiData): UserData;
    static getUserData(): Promise<UserData>;
    isDataStale(): Promise<boolean>;
    populate(): Promise<void>;
    popularUserTags(): TagWithUsageCounts[];
    static mutedKeywords(): Promise<string[]>;
    static getUserParticipatedHashtagsSorted(): Promise<TagWithUsageCounts[]>;
    static getUserParticipatedTags(): Promise<TagNames>;
    static sortTrendingTags(userTags: TagNames): TagWithUsageCounts[];
    private static buildUserParticipatedHashtags;
}
export {};
