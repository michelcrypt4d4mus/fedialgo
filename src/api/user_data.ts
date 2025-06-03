/*
 * Methods for dealing with data about the user currently using fedialgo - background
 * data for the scorers and so on.
 */
import { mastodon } from "masto";

import Account from "./objects/account";
import MastoApi from "./api";
import MostFavouritedAccountsScorer from "../scorer/feature/most_favourited_accounts_scorer";
import MostRetootedAccountsScorer from "../scorer/feature/most_retooted_accounts_scorer";
import Storage from "../Storage";
import ObjWithCountList, { ObjList } from "./obj_with_counts_list";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { CacheKey, ScoreName, TagTootsCacheKey } from "../enums";
import { config } from "../config";
import { addDicts, countValues, sortKeysByValue } from "../helpers/collection_helpers";
import { Logger } from '../helpers/logger';
import {
    type AccountNames,
    type StringNumberDict,
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
    favouriteAccounts: ObjList = new ObjWithCountList([], ScoreName.FAVOURITED_ACCOUNTS);
    favouritedTags: TagList = new TagList([], TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
    followedAccounts: StringNumberDict = {};  // Don't store the Account objects, just webfingerURI to save memory
    followedTags: TagList = new TagList([], ScoreName.FOLLOWED_TAGS);
    languagesPostedIn: StringNumberDict = {};
    mutedAccounts: AccountNames = {};
    participatedTags: TagList = new TagList([], TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
    preferredLanguage: string = config.locale.defaultLanguage;
    serverSideFilters: mastodon.v2.Filter[] = [];  // TODO: currently unused, only here for getCurrentState() by client app

    // Alternate constructor to build UserData from raw API data
    static buildFromData(data: UserApiData): UserData {
        const userData = new UserData();
        userData.favouritedTags = TagList.fromUsageCounts(data.favouritedToots, TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
        userData.followedAccounts = Account.countAccounts(data.followedAccounts);
        userData.followedTags = new TagList(data.followedTags, ScoreName.FOLLOWED_TAGS);
        userData.languagesPostedIn = countValues<Toot>(data.recentToots, (toot) => toot.language);
        userData.mutedAccounts = Account.buildAccountNames(data.mutedAccounts);
        userData.participatedTags = TagList.fromUsageCounts(data.recentToots, TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
        userData.preferredLanguage = sortKeysByValue(userData.languagesPostedIn)[0] || config.locale.defaultLanguage;
        userData.serverSideFilters = data.serverSideFilters;

        // Add up the favourites, retoots, and replies for each account
        // TODO: can't include replies yet bc we don't have the webfingerURI for those accounts, only inReplyToID
        const favouritedAccounts = MostFavouritedAccountsScorer.buildFavouritedAccounts(data.favouritedToots);
        const retootedAccounts = MostRetootedAccountsScorer.buildRetootedAccounts(data.recentToots);

        // Fill in zeros for accounts that the user follows but has not favourited or retooted
        const followedAccountZeros = data.followedAccounts.reduce((zeros, account) => {
            zeros[account.webfingerURI] = 0;
            return zeros;
        }, {} as StringNumberDict);

        const accountsDict = addDicts(favouritedAccounts, followedAccountZeros, retootedAccounts);
        userData.favouriteAccounts = ObjWithCountList.buildFromDict(accountsDict, ScoreName.FAVOURITED_ACCOUNTS);
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

        // TODO: remove this eventually
        responses[4].forEach(toot => {
            if (toot.application) {
                logger.trace(`Found recent user toot with application set:`, toot);
            }
        })

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
