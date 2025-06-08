import { mastodon } from "masto";
import Account from "./objects/account";
import { ObjList } from "./obj_with_counts_list";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { BooleanFilterOptionList } from "../filters/boolean_filter";
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
    lastUpdatedAt?: Date | null;
    favouriteAccounts: BooleanFilterOptionList;
    favouritedTags: TagList;
    followedAccounts: StringNumberDict;
    followedTags: TagList;
    languagesPostedIn: ObjList;
    mutedAccounts: AccountNames;
    participatedTags: TagList;
    preferredLanguage: string;
    serverSideFilters: mastodon.v2.Filter[];
    static build(): Promise<UserData>;
    static buildFromData(data: UserApiData): UserData;
    hasNewestApiData(): Promise<boolean>;
    private populateFavouriteAccounts;
    static getMutedKeywords(): Promise<string[]>;
}
export {};
