import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from "./objects/toot";
import { AccountNames, StringNumberDict, TagNames, TagWithUsageCounts } from "../types";
interface UserApiData {
    favouritedToots: Toot[];
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
    static build(): Promise<UserData>;
    isDataStale(): Promise<boolean>;
    popularUserTags(): TagWithUsageCounts[];
    static getMutedKeywords(): Promise<string[]>;
    static getUserParticipatedTags(): Promise<TagNames>;
    private static buildUserParticipatedHashtags;
}
export {};
