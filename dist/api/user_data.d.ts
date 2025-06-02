import { mastodon } from "masto";
import Account from "./objects/account";
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
export default class UserData {
    favouriteAccounts: TagList;
    favouritedTags: TagList;
    followedAccounts: StringNumberDict;
    followedTags: TagList;
    languagesPostedIn: StringNumberDict;
    mutedAccounts: AccountNames;
    participatedTags: TagList;
    preferredLanguage: string;
    serverSideFilters: mastodon.v2.Filter[];
    static buildFromData(data: UserApiData): UserData;
    static build(): Promise<UserData>;
    isDataStale(): Promise<boolean>;
    static getMutedKeywords(): Promise<string[]>;
}
export {};
