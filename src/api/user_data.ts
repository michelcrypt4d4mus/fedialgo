/*
 * Methods for dealing with data about the user currently using fedialgo - background
 * data for the scorers and so on.
 */
import { mastodon } from "masto";

import Account from "./objects/account";
import MastoApi from "./api";
import ObjWithCountList, { BooleanFilterOptionList, ObjList } from "./obj_with_counts_list";
import Storage from "../Storage";
import TagList from "./tag_list";
import Toot, { mostRecentTootedAt } from "./objects/toot";
import { BooleanFilterName, ScoreName, TagTootsCacheKey } from '../enums';
import { buildMutedRegex, extractMutedKeywords } from "./objects/filter";
import { config } from "../config";
import { keyById, resolvePromiseDict } from "../helpers/collection_helpers";
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
    blockedDomains: string[];
    favouritedToots: Toot[];
    followedAccounts: Account[];
    followedTags: TagWithUsageCounts[];
    mutedAccounts: Account[];
    recentToots: Toot[];
    serverSideFilters: mastodon.v2.Filter[];
};

/**
 * Represents background and scoring-related data about the current Fedialgo user.
 * Used as a central source of user context for scoring, filtering, and personalization.
 *
 * This class aggregates and manages user-related data such as favourited accounts, followed tags,
 * muted accounts, languages posted in, and server-side filters. It provides methods to build user data
 * from the Mastodon API or from raw API data, and supports updating, counting, and filtering operations
 * for use in scoring and filtering algorithms.
 *
 * @property {Set<string>} blockedDomains - Set of domains the user has blocked.
 * @property {BooleanFilterOptionList} favouriteAccounts - Accounts the user has favourited, retooted, or replied to.
 * @property {TagList} favouritedTags - List of tags the user has favourited.
 * @property {StringNumberDict} followedAccounts - Dictionary of accounts the user follows, keyed by account name.
 * @property {TagList} followedTags - List of tags the user follows.
 * @property {ObjList} languagesPostedIn - List of languages the user has posted in, with usage counts.
 * @property {AccountNames} mutedAccounts - Dictionary of accounts the user has muted or blocked, keyed by Account["webfingerURI"].
 * @property {RegExp} mutedKeywordsRegex - Cached regex for muted keywords, built from server-side filters.
 * @property {TagList} participatedTags - List of tags the user has participated in.
 * @property {string} preferredLanguage - The user's preferred language (ISO code).
 * @property {mastodon.v2.Filter[]} serverSideFilters - Array of server-side filters set by the user.
 */
export default class UserData {
    blockedDomains: Set<string> = new Set();
    favouriteAccounts = new BooleanFilterOptionList([], ScoreName.FAVOURITED_ACCOUNTS);
    favouritedTags = new TagList([], TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
    followedAccounts: StringNumberDict = {};
    followedTags = new TagList([], ScoreName.FOLLOWED_TAGS);
    languagesPostedIn: ObjList = new ObjWithCountList([], BooleanFilterName.LANGUAGE);
    mutedAccounts: AccountNames = {};
    mutedKeywordsRegex!: RegExp;  // Cached regex for muted keywords, built from server-side filters
    participatedTags = new TagList([], TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
    preferredLanguage = config.locale.defaultLanguage;
    serverSideFilters: mastodon.v2.Filter[] = [];

    private lastUpdatedAt?: Date | null;

    // Alternate constructor for the UserData object to build itself from the API (or cache)
    static async build(): Promise<UserData> {
        const responses = await resolvePromiseDict({
            blockedDomains: MastoApi.instance.getBlockedDomains(),
            favouritedToots: MastoApi.instance.getFavouritedToots(),
            followedAccounts: MastoApi.instance.getFollowedAccounts(),
            followedTags: MastoApi.instance.getFollowedTags(),
            mutedAccounts: MastoApi.instance.getMutedAccounts(),
            recentToots: MastoApi.instance.getRecentUserToots(),
            serverSideFilters: MastoApi.instance.getServerSideFilters(),
        }, logger, []);

        return this.buildFromData(responses as UserApiData);
    }

    // Alternate constructor to build UserData from raw API data
    static buildFromData(data: UserApiData): UserData {
        const userData = new UserData();
        userData.blockedDomains = new Set(data.blockedDomains);
        userData.favouritedTags = TagList.fromUsageCounts(data.favouritedToots, TagTootsCacheKey.FAVOURITED_TAG_TOOTS);
        userData.followedAccounts = Account.countAccounts(data.followedAccounts);
        userData.followedTags = new TagList(data.followedTags, ScoreName.FOLLOWED_TAGS);
        userData.mutedAccounts = Account.buildAccountNames(data.mutedAccounts);
        userData.mutedKeywordsRegex = buildMutedRegex(data.serverSideFilters);
        userData.participatedTags = TagList.fromUsageCounts(data.recentToots, TagTootsCacheKey.PARTICIPATED_TAG_TOOTS);
        userData.serverSideFilters = data.serverSideFilters;
        userData.languagesPostedIn.populateByCountingProps(data.recentToots, tootLanguageOption);
        userData.populateFavouriteAccounts(data);

        // Use the newest recent or favourited toot as proxy for freshness (other stuff rarely changes)
        userData.lastUpdatedAt = mostRecentTootedAt([...data.recentToots, ...data.favouritedToots]);
        userData.preferredLanguage = userData.languagesPostedIn.topObjs()[0]?.name || config.locale.defaultLanguage;
        logger.trace("Built from data:", userData);
        return userData;
    }

    // If there's newer data in the cache the data is not fresh
    async hasNewestApiData(): Promise<boolean> {
        return !!(Storage.lastUpdatedAt && this.lastUpdatedAt && (this.lastUpdatedAt >= Storage.lastUpdatedAt));
    }

    // Add up the favourites, retoots, and replies for each account
    private populateFavouriteAccounts(data: UserApiData): void {
        const retootsAndFaves = [...Toot.onlyRetoots(data.recentToots), ...data.favouritedToots];
        const retootAndFaveAccounts = retootsAndFaves.map(t => t.author);
        const followedAccountIdMap = keyById(data.followedAccounts);

        // TODO: Replies are imperfect, we only have inReplyToAccountId to work with. IDing ~1/3rd of the replies.
        // Currently that's only around 1/3rd of the replies.
        const replies = Toot.onlyReplies(data.recentToots);
        const repliedToAccounts = replies.map(toot => followedAccountIdMap[toot.inReplyToAccountId!]).filter(Boolean);
        logger.trace(`Found ${retootsAndFaves.length} retootsAndFaves, ${repliedToAccounts.length} replied toots' accounts (of ${replies.length} replies)`);
        const favouredAccounts = [...repliedToAccounts, ...retootAndFaveAccounts];
        this.favouriteAccounts.populateByCountingProps(favouredAccounts, account => account.asBooleanFilterOption);

        // Find the followed accounts that don't exist yet as options. Has side effect of mutating isFollowed property
        const optionsToAdd = data.followedAccounts.filter((account) => {
            const option = account.asBooleanFilterOption;
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

        this.favouriteAccounts.addObjs(optionsToAdd.map(account => account.asBooleanFilterOption));
    }

    /////////////////////////////
    //      Static Methods     //
    /////////////////////////////

    /**
     * Get an array of keywords the user has muted on the server side
     * @returns {Promise<string[]>} An array of muted keywords.
     */
    static async getMutedKeywords(): Promise<string[]> {
        return extractMutedKeywords(await MastoApi.instance.getServerSideFilters());
    }

    /**
     * Build a regex that matches any of the user's muted keywords.
     * @returns {Promise<RegExp>} A RegExp that matches any of the user's muted keywords.
     */
    static async getMutedKeywordsRegex(): Promise<RegExp> {
        return buildMutedRegex(await MastoApi.instance.getServerSideFilters());
    }
};


// extract information for language BoooleanFilterOption
function tootLanguageOption(toot: Toot): BooleanFilterOption {
    if (!toot.language) {
        logger.warn("Toot has no language set, using default language instead", toot);
        toot.language = config.locale.defaultLanguage;
    }

    return {
        displayName: languageName(toot.language!),
        name: toot.language!
    };
};
