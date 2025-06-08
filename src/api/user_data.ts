/*
 * Methods for dealing with data about the user currently using fedialgo - background
 * data for the scorers and so on.
 */
import { mastodon } from "masto";

import Account from "./objects/account";
import MastoApi from "./api";
import ObjWithCountList, { ObjList } from "./obj_with_counts_list";
import Storage from "../Storage";
import TagList from "./tag_list";
import Toot from "./objects/toot";
import { BooleanFilterName, CacheKey, ScoreName, TagTootsCacheKey } from '../enums';
import { config } from "../config";
import { keyById } from "../helpers/collection_helpers";
import { languageName } from "../helpers/language_helper";
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

    // Alternate constructor to build UserData from raw API data
    static buildFromData(data: UserApiData): UserData {
        const userData = new UserData();
        userData.populateFavouriteAccounts(data);
        userData.favouritedTags = TagList.fromUsageCounts(data.favouritedToots, TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
        userData.followedAccounts = Account.countAccounts(data.followedAccounts);
        userData.followedTags = new TagList(data.followedTags, ScoreName.FOLLOWED_TAGS);
        userData.mutedAccounts = Account.buildAccountNames(data.mutedAccounts);
        userData.participatedTags = TagList.fromUsageCounts(data.recentToots, TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
        userData.serverSideFilters = data.serverSideFilters;
        userData.languagesPostedIn.populateByCountingProps(data.recentToots, tootLanguageOption);
        userData.preferredLanguage = userData.languagesPostedIn.topObjs()[0]?.name || config.locale.defaultLanguage;
        logger.trace("Built from data:", userData);
        return userData;
    }

    // Use MUTED_ACCOUNTS as a proxy for staleness
    // TODO: could be smarter
    async isDataStale(): Promise<boolean> {
        return this.isEmpty() || await Storage.isDataStale(CacheKey.MUTED_ACCOUNTS);
    }

    // Add up the favourites, retoots, and replies for each account
    private populateFavouriteAccounts(data: UserApiData): void {
        const retootsAndFaves = [...Toot.onlyRetoots(data.recentToots), ...data.favouritedToots];
        const retootAndFaveAccounts = retootsAndFaves.map(t => t.author());
        const followedAccountIdMap = keyById(data.followedAccounts);

        // TODO: Replies are imperfect, we only have inReplyToAccountId to work with. IDing ~1/3rd of the replies.
        // Currently that's only around 1/3rd of the replies.
        const replies = Toot.onlyReplies(data.recentToots);
        const repliedToAccounts = replies.map(toot => followedAccountIdMap[toot.inReplyToAccountId!]).filter(Boolean);
        logger.trace(`Found ${retootsAndFaves.length} retootsAndFaves, ${repliedToAccounts.length} replied toots' accounts (of ${replies.length} replies)`);
        const favouredAccounts = [...repliedToAccounts, ...retootAndFaveAccounts];
        this.favouriteAccounts.populateByCountingProps(favouredAccounts, account => account.toBooleanFilterOption());

        // Find the followed accounts that don't exist yet as options. Has side effect of mutating isFollowed property
        const optionsToAdd = data.followedAccounts.filter((account) => {
            const option = account.toBooleanFilterOption();
            const existingOption = this.favouriteAccounts.getObj(option.name);

            if (!option.isFollowed) {
                logger.warn("populateFavouriteAccounts() followed account is not marked as followed:", account);
                option.isFollowed = true;
            }

            if (existingOption) {
                existingOption.isFollowed = option.isFollowed;
                return false;
            } else {
                return true;
            }
        });

        this.favouriteAccounts.addObjs(optionsToAdd.map(account => account.toBooleanFilterOption()));
    }

    // Returns true if the user has no data, i.e. no favourite accounts, followed tags, etc.
    private isEmpty(): boolean {
        const empty = this.favouriteAccounts.length === 0 &&
            this.favouritedTags.length === 0 &&
            this.followedTags.length === 0 &&
            this.participatedTags.length === 0 &&
            this.languagesPostedIn.length === 0 &&
            Object.keys(this.followedAccounts).length === 0 &&
            Object.keys(this.mutedAccounts).length === 0;

        logger.trace("UserData.isEmpty() =", empty);
        return empty;
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


// extract information for language BoooleanFilterOption
function tootLanguageOption (toot: Toot): BooleanFilterOption {
    if (!toot.language) {
        logger.warn("Toot has no language set, using default language instead", toot);
        toot.language = config.locale.defaultLanguage;
    }

    return {
        displayName: languageName(toot.language!),
        name: toot.language!
    };
};
