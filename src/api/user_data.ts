/*
 * Methods for dealing with data about the user currently using fedialgo - background
 * data for the scorers and so on.
 */
import { mastodon } from "masto";

import Account from "./objects/account";
// import BooleanFilterOptionList from "../filters/boolean_filter_option_list";
import MastoApi from "./api";
// import MostFavouritedAccountsScorer from "../scorer/feature/most_favourited_accounts_scorer";
// import MostRetootedAccountsScorer from "../scorer/feature/most_retooted_accounts_scorer";
import ObjWithCountList, { ObjList } from "./obj_with_counts_list";
import Storage from "../Storage";
import TagList from "./tag_list";
import Toot, { UNKNOWN } from "./objects/toot";
import { BooleanFilterName } from '../enums';
import { CacheKey, ScoreName, TagTootsCacheKey } from "../enums";
import { config } from "../config";
import { addDicts, countValues, keyById, sortKeysByValue } from "../helpers/collection_helpers";
import { Logger } from '../helpers/logger';
import {
    type AccountNames,
    type BooleanFilterOption,
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
    // numToots in favouriteAccounts is the sum of retoots, favourites, and replies to that account
    favouriteAccounts = new ObjWithCountList<BooleanFilterOption>([], ScoreName.FAVOURITED_ACCOUNTS);
    favouritedTags = new TagList([], TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
    followedAccounts: StringNumberDict = {};
    followedTags = new TagList([], ScoreName.FOLLOWED_TAGS);
    languagesPostedIn: ObjList = new ObjWithCountList([], BooleanFilterName.LANGUAGE);
    mutedAccounts: AccountNames = {};
    participatedTags = new TagList([], TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
    preferredLanguage = config.locale.defaultLanguage;
    serverSideFilters: mastodon.v2.Filter[] = [];  // TODO: currently unused, only here for getCurrentState() by client app

    // Alternate constructor to build UserData from raw API data
    static buildFromData(data: UserApiData): UserData {
        const userData = new UserData();
        userData.favouriteAccounts = this.buildFavouriteAccount(data);
        userData.favouritedTags = TagList.fromUsageCounts(data.favouritedToots, TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
        userData.followedAccounts = Account.countAccounts(data.followedAccounts);
        userData.followedTags = new TagList(data.followedTags, ScoreName.FOLLOWED_TAGS);
        userData.mutedAccounts = Account.buildAccountNames(data.mutedAccounts);
        userData.participatedTags = TagList.fromUsageCounts(data.recentToots, TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
        userData.serverSideFilters = data.serverSideFilters;

        // Language stuff
        const languageUsageCounts = countValues(data.recentToots, (toot) => toot.language);
        userData.languagesPostedIn = ObjWithCountList.buildFromDict(languageUsageCounts, BooleanFilterName.LANGUAGE);
        userData.preferredLanguage = userData.languagesPostedIn.topObjs()[0]?.name || config.locale.defaultLanguage;
        logger.trace("Built from data:", userData);
        return userData;
    }

    // Add up the favourites, retoots, and replies for each account
    private static buildFavouriteAccount(data: UserApiData): ObjWithCountList<BooleanFilterOption> {
        const retootsAndFaves = [...Toot.onlyRetoots(data.recentToots), ...data.favouritedToots];
        const retootAndFaveAccounts = retootsAndFaves.map(t => t.account);
        const followedAccountIdMap = keyById(data.followedAccounts);

        // TODO: Replies are imperfect - we're only checking followed accts bc we only have account ID to work with
        const repliedToAccounts = Toot.onlyReplies(data.recentToots)
                                      .map(toot => followedAccountIdMap[toot.inReplyToAccountId!])
                                      .filter(Boolean);

        const accountCounts = Account.countAccountsWithObj([...repliedToAccounts, ...retootAndFaveAccounts]);

        // Fill in zeros for accounts that the user follows but has not favourited or retooted
        data.followedAccounts.forEach((account) => {
            accountCounts[account.webfingerURI] ??= {account, count: 0};
            accountCounts[account.webfingerURI].isFollowed = true;
        });

        const accountOptions = Object.values(accountCounts).map(accountCount => {
            const option: BooleanFilterOption = {
                displayName: accountCount.account.displayName,
                displayNameWithEmoji: accountCount.account.displayNameWithEmojis(),
                isFollowed: accountCount.isFollowed,
                name: accountCount.account.webfingerURI,
                numToots: accountCount.count,
            }

            return option;
        });

        return new ObjWithCountList(accountOptions, ScoreName.FAVOURITED_ACCOUNTS);
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
            if (toot.application && toot.application.name != UNKNOWN) {
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
