import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from "./objects/toot";
import { AccountNames, TagNames, TootLike, TrendingTag, UserDataSerialized } from "../types";
interface UserDataCls extends UserDataSerialized {
    populate: () => Promise<void>;
}
interface UserDataProps {
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
    static buildFromData(data: UserDataProps): UserData;
    static getUserData(): Promise<UserData>;
    constructor();
    populate(): Promise<void>;
    isDataStale(): Promise<boolean>;
    serialize(): UserDataSerialized;
    popularUserTags(): TrendingTag[];
    static buildUserHashtags(userToots: TootLike[]): TagNames;
    static getUsersHashtags(): Promise<TagNames>;
    static sortedUsersHashtags(): Promise<TrendingTag[]>;
    static sortTagNames(userTags: TagNames): TrendingTag[];
}
export {};
