/*
 * Methods for dealing with data about the user currently using fedialgo - background
 * data for the scorers and so on.
 */
import { mastodon } from "masto";

import Account from "./objects/account";
import MastoApi from "./api";
import Storage from "../Storage";
import Toot from "./objects/toot";
import { AccountNames, CacheKey, StringNumberDict, TagNames, TagWithUsageCounts, TootLike } from "../types";
import { buildTagNames, countTags } from "./objects/tag";
import { config } from "../config";
import { countValues, sortKeysByValue, sortObjsByProps } from "../helpers/collection_helpers";
import { traceLog } from "../helpers/log_helpers";

const SORT_TAGS_BY = [
    "numToots" as keyof TagWithUsageCounts,
    "name" as keyof TagWithUsageCounts
];

// Raw API data required to build UserData
interface UserApiData {
    favouritedToots: Toot[];
    followedAccounts: Account[];
    followedTags: TagWithUsageCounts[];
    mutedAccounts: Account[];
    recentToots: Toot[];
    serverSideFilters: mastodon.v2.Filter[];
};


export default class UserData {
    favouritedTagCounts: StringNumberDict = {};
    followedAccounts: StringNumberDict = {};  // Don't store the Account objects, just webfingerURI to save memory
    followedTags: TagNames = {};
    languagesPostedIn: StringNumberDict = {};
    mutedAccounts: AccountNames = {};
    participatedHashtags: TagNames = {};
    preferredLanguage: string = config.locale.defaultLanguage;
    serverSideFilters: mastodon.v2.Filter[] = [];

    // Alternate constructor to build UserData from raw API data
    static buildFromData(data: UserApiData): UserData {
        const userData = new UserData();
        userData.favouritedTagCounts = countTags(data.favouritedToots);
        userData.followedAccounts = Account.countAccounts(data.followedAccounts);
        userData.followedTags = buildTagNames(data.followedTags);
        userData.languagesPostedIn = countValues<Toot>(data.recentToots, (toot) => toot.language);
        userData.mutedAccounts = Account.buildAccountNames(data.mutedAccounts);
        userData.participatedHashtags = UserData.buildUserParticipatedHashtags(data.recentToots);
        userData.preferredLanguage = sortKeysByValue(userData.languagesPostedIn)[0] || config.locale.defaultLanguage;
        userData.serverSideFilters = data.serverSideFilters;
        traceLog("[UserData] built from data:", userData);
        return userData;
    }

    // Alternate constructor for the UserData object to build itself from the API (or cache)
    static async getUserData(): Promise<UserData> {
        const userData = new UserData();
        await userData.populate();
        return userData;
    }

    // Use MUTED_ACCOUNTS as a proxy for staleness
    // TODO: could be smarter
    async isDataStale(): Promise<boolean> {
        return await Storage.isDataStale(CacheKey.MUTED_ACCOUNTS);
    }

    // Pull latest user's data from cache and/or API
    async populate(): Promise<void> {
        const responses = await Promise.all([
            MastoApi.instance.getFavouritedToots(),
            MastoApi.instance.getFollowedAccounts(),
            MastoApi.instance.getFollowedTags(),
            MastoApi.instance.getMutedAccounts(),
            UserData.getUserParticipatedTags(),
            MastoApi.instance.getServerSideFilters(),
        ]);

        this.favouritedTagCounts = countTags(responses[0]);
        this.followedAccounts = Account.countAccounts(responses[1]);
        this.followedTags = buildTagNames(responses[2]);
        this.mutedAccounts = Account.buildAccountNames(responses[3]);
        this.participatedHashtags = responses[4];
        this.serverSideFilters = responses[5];
    }

    // Returns TrendingTags the user has participated in sorted by number of times they tooted it
    popularUserTags(): TagWithUsageCounts[] {
        return UserData.sortTrendingTags(this.participatedHashtags);
    }

    ////////////////////////////
    //      Class Methods     //
    ////////////////////////////

    // Return an array of keywords the user has muted on the server side
    static async mutedKeywords(): Promise<string[]> {
        const serverSideFilters = await MastoApi.instance.getServerSideFilters();
        let keywords = serverSideFilters.map(f => f.keywords.map(k => k.keyword)).flat().flat().flat();
        keywords = keywords.map(k => k.toLowerCase().replace(/^#/, ""));
        traceLog(`[mutedKeywords()] found ${keywords.length} keywords:`, keywords);
        return keywords;
    }

    // Fetch or load array of TrendingTags sorted by number of times the user tooted it
    static async getUserParticipatedHashtagsSorted(): Promise<TagWithUsageCounts[]> {
        const userTags = await UserData.getUserParticipatedTags();
        return this.sortTrendingTags(userTags);
    }

    // Fetch or load TrendingTag objects for the user's Toot history (tags the user has tooted)
    // The numToots prop is set to number of times user tooted it
    static async getUserParticipatedTags(): Promise<TagNames> {
        const recentToots = await MastoApi.instance.getRecentUserToots();
        return this.buildUserParticipatedHashtags(recentToots);
    }

    // Return array of TrendingTags sorted by numToots
    static sortTrendingTags(userTags: TagNames): TagWithUsageCounts[] {
        return sortObjsByProps(Object.values(userTags), SORT_TAGS_BY, [false, true]);
    }

    // Build a dict of tag names to the number of times the user tooted it from a list of toots
    private static buildUserParticipatedHashtags(userToots: TootLike[]): TagNames {
        // Ignores reblogs. Only counts toots authored by the user
        const tags = userToots.flatMap(toot => toot.tags || []) as TagWithUsageCounts[];

        return tags.reduce(
            (tags, tag) => {
                tags[tag.name] ??= tag;
                tags[tag.name].numToots = (tags[tag.name].numToots || 0) + 1;
                return tags;
            },
            {} as TagNames
        );
    }
};
