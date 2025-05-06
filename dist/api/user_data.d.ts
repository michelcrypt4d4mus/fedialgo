import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from "./objects/toot";
import { AccountNames, StringNumberDict, TagNames, TrendingTag } from "../types";
interface UserApiData {
    followedAccounts: Account[];
    followedTags: TrendingTag[];
    mutedAccounts: Account[];
    recentToots: Toot[];
    serverSideFilters: mastodon.v2.Filter[];
}
export default class UserData {
    followedAccounts: StringNumberDict;
    followedTags: TrendingTag[];
    languagesPostedIn: StringNumberDict;
    mutedAccounts: AccountNames;
    participatedHashtags: TagNames;
    serverSideFilters: mastodon.v2.Filter[];
    static buildFromData(data: UserApiData): UserData;
    static getUserData(): Promise<UserData>;
    isDataStale(): Promise<boolean>;
    populate(): Promise<void>;
    popularUserTags(): TrendingTag[];
    preferredLanguage(): string;
    static mutedKeywords(): Promise<string[]>;
    static getUserParticipatedHashtagsSorted(): Promise<TrendingTag[]>;
    static getUserParticipatedTags(): Promise<TagNames>;
    static sortTrendingTags(userTags: TagNames): TrendingTag[];
    private static buildUserParticipatedHashtags;
}
export {};
