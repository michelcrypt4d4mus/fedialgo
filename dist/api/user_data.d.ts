import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from "./objects/toot";
import { AccountNames, TagNames, TrendingTag, UserDataSerialized } from "../types";
interface UserDataCls extends UserDataSerialized {
    isDataStale: () => Promise<boolean>;
    populate: () => Promise<void>;
    popularUserTags: () => TrendingTag[];
    serialize: () => UserDataSerialized;
}
interface UserApiData {
    followedAccounts: Account[];
    followedTags: TrendingTag[];
    mutedAccounts: Account[];
    recentToots: Toot[];
    serverSideFilters: mastodon.v2.Filter[];
}
export default class UserData implements UserDataCls {
    followedAccounts: AccountNames;
    followedTags: TrendingTag[];
    mutedAccounts: AccountNames;
    participatedHashtags: TagNames;
    serverSideFilters: mastodon.v2.Filter[];
    static buildFromData(data: UserApiData): UserData;
    static getUserData(): Promise<UserData>;
    constructor();
    isDataStale(): Promise<boolean>;
    populate(): Promise<void>;
    popularUserTags(): TrendingTag[];
    serialize(): UserDataSerialized;
    static getUsersHashtags(): Promise<TagNames>;
    static sortedUsersHashtags(): Promise<TrendingTag[]>;
    static sortTagNames(userTags: TagNames): TrendingTag[];
    private static buildUserHashtags;
}
export {};
