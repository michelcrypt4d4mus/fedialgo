/*
 * Methods for dealing with user data.
 */
import { mastodon } from "masto";

import Account from "./objects/account";
import Storage from "../Storage";
import Toot from "./objects/toot";
import { sortObjsByProp } from "../helpers/collection_helpers";
import { MastoApi } from "./api";
import { AccountNames, StorageKey, TagNames, TootLike, TrendingTag, UserDataSerialized } from "../types";

interface UserDataCls extends UserDataSerialized {
    populate: () => Promise<void>;
};

// Raw API data required to build UserData
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

    static buildFromData(data: UserDataProps): UserData {
        const userData = new UserData();
        userData.followedAccounts = Account.buildAccountNames(data.followedAccounts);
        userData.followedTags = data.followedTags;
        userData.mutedAccounts = Account.buildAccountNames(data.mutedAccounts);
        userData.participatedHashtags = UserData.buildUserHashtags(data.recentToots);
        userData.serverSideFilters = data.serverSideFilters;
        return userData;
    }

    // Build a UserData object from the API and/or storage cache
    static async getUserData(): Promise<UserData> {
        const userData = new UserData();
        await userData.populate();
        return userData;
    }

    // Builds an empty UserData object
    constructor() {
        this.followedAccounts = {};
        this.followedTags = [];
        this.mutedAccounts = {};
        this.participatedHashtags = {};
        this.serverSideFilters = [];
    }

    // Pull user's data from cache and/or API
    async populate(): Promise<void> {
        const responses = await Promise.all([
            MastoApi.instance.getFollowedAccounts(),
            MastoApi.instance.getFollowedTags(),
            MastoApi.instance.getMutedAccounts(),
            UserData.getUsersHashtags(),
            MastoApi.instance.getServerSideFilters(),
        ]);

        this.followedAccounts = Account.buildAccountNames(responses[0]);
        this.followedTags = responses[1];
        this.mutedAccounts = Account.buildAccountNames(responses[2]);
        this.participatedHashtags = responses[3];
        this.serverSideFilters = responses[4];
        console.debug(`[UserData] Populated UserData object`);
    }

    // Use MUTED_ACCOUNTS as a proxy for staleness
    // TODO: could be smarter
    async isDataStale(): Promise<boolean> {
        return await Storage.isDataStale(StorageKey.MUTED_ACCOUNTS);
    }

    // Strip functions from the object
    serialize(): UserDataSerialized {
        return this as UserDataSerialized;
    }

    // Returns tags the user has participated in sorted by number of times
    popularUserTags(): TrendingTag[] {
        return UserData.sortTagNames(this.participatedHashtags);
    }

    // Build a dict of tag names to the number of times the user tooted it from a list of toots
    static buildUserHashtags(userToots: TootLike[]): TagNames {
        const tags = userToots.flatMap(toot => (toot.reblog ?? toot).tags || []) as TrendingTag[];

        return tags.reduce(
            (tags, tag) => {
                tags[tag.name] ??= tag;
                tags[tag.name].numToots = (tags[tag.name].numToots || 0) + 1;
                return tags;
            },
            {} as TagNames
        );
    }

    // Build TrendingTag objects with numToots prop set to number of times the user tooted it
    static async getUsersHashtags(): Promise<TagNames> {
        const recentToots = await MastoApi.instance.getUserRecentToots();
        return this.buildUserHashtags(recentToots);
    }

    // Return array of TrendingTags sorted by number of times the user tooted it
    static async sortedUsersHashtags(): Promise<TrendingTag[]> {
        const userTags = await UserData.getUsersHashtags();
        return this.sortTagNames(userTags);
    }

    // Return array of TrendingTags sorted by numToots
    static sortTagNames(userTags: TagNames): TrendingTag[] {
        return sortObjsByProp(Object.values(userTags), "numToots" as keyof TrendingTag, false);
    }
};
