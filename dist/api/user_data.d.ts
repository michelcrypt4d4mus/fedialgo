import { mastodon } from "masto";
import Account from "./objects/account";
import ObjWithCountList, { ObjList } from "./obj_with_counts_list";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { type AccountNames, type BooleanFilterOption, type StringNumberDict, type TagWithUsageCounts } from "../types";
interface UserApiData {
    favouritedToots: Toot[];
    followedAccounts: Account[];
    followedTags: TagWithUsageCounts[];
    mutedAccounts: Account[];
    recentToots: Toot[];
    serverSideFilters: mastodon.v2.Filter[];
}
export default class UserData {
    favouriteAccounts: ObjWithCountList<BooleanFilterOption>;
    favouritedTags: TagList;
    followedAccounts: StringNumberDict;
    followedTags: TagList;
    languagesPostedIn: ObjList;
    mutedAccounts: AccountNames;
    participatedTags: TagList;
    preferredLanguage: string;
    serverSideFilters: mastodon.v2.Filter[];
    static buildFromData(data: UserApiData): UserData;
    static build(): Promise<UserData>;
    isDataStale(): Promise<boolean>;
    private populateFavouriteAccounts;
    private isEmpty;
    static getMutedKeywords(): Promise<string[]>;
}
export {};
