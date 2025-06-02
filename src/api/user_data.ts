/*
 * Methods for dealing with data about the user currently using fedialgo - background
 * data for the scorers and so on.
 */
import { mastodon } from "masto";

import Account from "./objects/account";
import MastoApi from "./api";
import Storage from "../Storage";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { CacheKey } from "../enums";
import { config } from "../config";
import { countValues, sortKeysByValue } from "../helpers/collection_helpers";
import { Logger } from '../helpers/logger';
import {
    type AccountNames,
    type StringNumberDict,
    type TagNames,
    type TagWithUsageCounts
} from "../types";

const logger = new Logger("UserData");

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
    favouritedTags: TagList = new TagList([]);
    followedAccounts: StringNumberDict = {};  // Don't store the Account objects, just webfingerURI to save memory
    followedTags: TagNames = {};  // TODO: could be TagList?
    languagesPostedIn: StringNumberDict = {};
    mutedAccounts: AccountNames = {};
    participatedHashtags: TagNames = {};  // TODO: could be TagList?
    preferredLanguage: string = config.locale.defaultLanguage;
    serverSideFilters: mastodon.v2.Filter[] = [];  // TODO: currently unused, only here for getCurrentState() by client app

    // Alternate constructor to build UserData from raw API data
    static buildFromData(data: UserApiData): UserData {
        const userData = new UserData();
        userData.favouritedTags = TagList.fromUsageCounts(data.favouritedToots)
        userData.followedAccounts = Account.countAccounts(data.followedAccounts);
        userData.followedTags = new TagList(data.followedTags).tagNameDict();
        userData.languagesPostedIn = countValues<Toot>(data.recentToots, (toot) => toot.language);
        userData.mutedAccounts = Account.buildAccountNames(data.mutedAccounts);
        userData.participatedHashtags = TagList.fromUsageCounts(data.recentToots).tagNameDict();
        userData.preferredLanguage = sortKeysByValue(userData.languagesPostedIn)[0] || config.locale.defaultLanguage;
        userData.serverSideFilters = data.serverSideFilters;
        logger.trace("Built from data:", userData);
        return userData;
    }

    // Alternate constructor for the UserData object to build itself from the API (or cache)
    static async build(): Promise<UserData> {
        const responses = await Promise.all([
            MastoApi.instance.getFavouritedToots(),
            MastoApi.instance.getFollowedAccounts(),
            MastoApi.instance.getFollowedTags(),
            MastoApi.instance.getMutedAccounts(),
            MastoApi.instance.getRecentUserToots(),
            MastoApi.instance.getServerSideFilters(),
        ]);

        return this.buildFromData({
            favouritedToots: responses[0],
            followedAccounts: responses[1],
            followedTags: responses[2],
            mutedAccounts: responses[3],
            recentToots: responses[4],
            serverSideFilters: responses[5],
        });
    }

    // Use MUTED_ACCOUNTS as a proxy for staleness
    // TODO: could be smarter
    async isDataStale(): Promise<boolean> {
        return await Storage.isDataStale(CacheKey.MUTED_ACCOUNTS);
    }

    // Returns TrendingTags the user has participated in sorted by number of times they tooted it
    popularUserTags(): TagWithUsageCounts[] {
        return (new TagList(Object.values(this.participatedHashtags))).topTags();
    }

    /////////////////////////////
    //      Static Methods     //
    /////////////////////////////

    // Return an array of keywords the user has muted on the server side
    static async getMutedKeywords(): Promise<string[]> {
        const serverSideFilters = await MastoApi.instance.getServerSideFilters();
        let keywords = serverSideFilters.map(f => f.keywords.map(k => k.keyword)).flat().flat().flat();
        keywords = keywords.map(k => k.toLowerCase().replace(/^#/, ""));
        logger.trace(`<mutedKeywords()> found ${keywords.length} keywords:`, keywords);
        return keywords;
    }
};
