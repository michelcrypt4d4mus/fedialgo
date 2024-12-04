/*
 * Handles caching of things that are slow to fetch and/or computer like the top
 * retoots, top favorites, etc.
 */
import { mastodon } from "masto";

import coreServerFeature from "../features/coreServerFeature";
import FavsFeature from "../features/favsFeature";
import FollowedTagsFeature from "../features/followed_tags_feature";
import InteractionsFeature from "../features/InteractionsFeature";
import reblogsFeature from "../features/reblogsFeature";
import { getUserRecentToots } from "./api";
import repliedFeature from "../features/replied_feature";
import Storage, { Key } from "../Storage";
import { AccountFeature, StringNumberDict, ServerFeature, TootURIs, AccountNames } from "../types";
import { mastodonFetchPages } from "../api/api";

// This doesn't quite work as advertised. It actually forces a reload every 10 app opens
// starting at the 9th one. Also bc of the way it was implemented it won't work the same
// way for any number other than 9.
const MAX_FOLLOWING_ACCOUNT_TO_PULL = 5_000;
const RELOAD_FEATURES_EVERY_NTH_OPEN = 9;
const LOADED_FROM_STORAGE = "Loaded from storage";
const RETRIEVED = 'Retrieved';


export default class MastodonApiCache extends Storage {
    // Get an array of Accounts the user is following
    static async getFollowedAccounts(api: mastodon.rest.Client): Promise<AccountNames> {
        let followedAccounts = await this.getFollowedAccts();
        let logAction = LOADED_FROM_STORAGE;

        if (followedAccounts == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null) throw new Error("Error getting followed accounts (no user identity found)");

            const accounts = await mastodonFetchPages<mastodon.v1.Account>({
                fetchMethod: api.v1.accounts.$select(user.id).following.list,
                maxRecords: MAX_FOLLOWING_ACCOUNT_TO_PULL,
                label: 'followedAccounts'
            });

            followedAccounts = accounts.reduce(
                (accountNames, account) => {
                    accountNames[account.acct] = account;
                    return accountNames;
                },
                {} as AccountNames
            );

            logAction = RETRIEVED;
            await this.set(Key.FOLLOWED_ACCOUNTS, followedAccounts);
        }

        console.log(`${logPrefix(logAction)} followed accounts:`, followedAccounts);
        return followedAccounts;
    }

    static async getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature> {
        let topFavs: AccountFeature = await this.get(Key.TOP_FAVS) as AccountFeature;
        let logAction = LOADED_FROM_STORAGE;

        if (topFavs == null || (await this.shouldReloadFeatures())) {
            topFavs = await FavsFeature(api);
            logAction = RETRIEVED;
            await this.set(Key.TOP_FAVS, topFavs);
        }

        console.log(`${logPrefix(logAction)} Accounts user has favorited the most:`, topFavs);
        return topFavs;
    }

    // Get the users recent toots // TODO: probably shouldn't load these from storage usually?
    static async getRecentToots(api: mastodon.rest.Client): Promise<TootURIs> {
        let recentTootURIs: TootURIs = await this.get(Key.RECENT_TOOTS) as TootURIs;
        let logAction = LOADED_FROM_STORAGE;

        if (recentTootURIs == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null) throw new Error("Error getting recent toots (no user identity found)");
            const recentToots = await getUserRecentToots(api, user);

            recentTootURIs = recentToots.reduce((acc, toot) => {
                acc[toot.reblog?.uri || toot.uri] = toot;
                return acc;
            }, {} as TootURIs);

            logAction = RETRIEVED;
            await this.set(Key.RECENT_TOOTS, recentTootURIs);
        }

        console.log(`${logPrefix(logAction)} User's recent toot URIs:`, recentTootURIs);
        return recentTootURIs;
    }

    static async getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature> {
        let topReblogs: AccountFeature = await this.get(Key.TOP_REBLOGS) as AccountFeature;
        let logAction = LOADED_FROM_STORAGE;

        if (topReblogs == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null) throw new Error("No user identity found");

            topReblogs = await reblogsFeature(api, user, Object.values(await this.getRecentToots(api)));
            logAction = RETRIEVED;
            await this.set(Key.TOP_REBLOGS, topReblogs);
        }

        console.log(`${logPrefix(logAction)} User's most retooted accounts:`, topReblogs);
        return topReblogs;
    }

    static async getMostRepliedAccounts(api: mastodon.rest.Client): Promise<StringNumberDict> {
        let mostReplied: StringNumberDict = await this.get(Key.REPLIED_TO) as StringNumberDict;
        let logAction = LOADED_FROM_STORAGE;

        if (mostReplied == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null) throw new Error("No user identity found");

            mostReplied = await repliedFeature(api, user, Object.values(await this.getRecentToots(api)));
            logAction = RETRIEVED;
            await this.set(Key.REPLIED_TO, mostReplied);
        }

        console.log(`${logPrefix(logAction)} Accounts user has replied to:`, mostReplied);
        return mostReplied;
    }

    static async getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature> {
        let topInteracts: AccountFeature = await this.get(Key.TOP_INTERACTS) as AccountFeature;
        let logAction = LOADED_FROM_STORAGE;

        if (topInteracts == null || (await this.shouldReloadFeatures())) {
            topInteracts = await InteractionsFeature(api);
            logAction = RETRIEVED;
            await this.set(Key.TOP_INTERACTS, topInteracts);
        }

        console.log(`${logPrefix(logAction)} Accounts that have interacted the most with user:`, topInteracts);
        return topInteracts;
    }

    static async getFollowedTags(api: mastodon.rest.Client): Promise<StringNumberDict> {
        let followedTags: StringNumberDict = await this.get(Key.FOLLOWED_TAGS) as StringNumberDict;
        let logAction = LOADED_FROM_STORAGE;

        if (followedTags == null || (await this.shouldReloadFeatures())) {
            followedTags = await FollowedTagsFeature(api);
            logAction = RETRIEVED;
            await this.set(Key.FOLLOWED_TAGS, followedTags);
        }

        console.log(`${logPrefix(logAction)} Followed tags`, followedTags);
        return followedTags;
    }

    // Returns information about mastodon servers
    static async getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature> {
        let coreServer: ServerFeature = await this.get(Key.CORE_SERVER) as ServerFeature;
        let logAction = LOADED_FROM_STORAGE;

        if (coreServer == null || (await this.shouldReloadFeatures())) {
            coreServer = await coreServerFeature(await this.getFollowedAccounts(api));
            logAction = RETRIEVED;
            await this.set(Key.CORE_SERVER, coreServer);
        }

        console.log(`${logPrefix(logAction)} coreServer`, coreServer);
        return coreServer;
    }

    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getTopServerDomains(api: mastodon.rest.Client): Promise<string[]> {
        const coreServers = await this.getCoreServer(api);

        // Count the number of followed users per server
        const topServerDomains = Object.keys(coreServers)
                                       .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)
                                       .sort((a, b) => (coreServers[b] - coreServers[a]));

        console.log(`${logPrefix("topServerDomains")} Found top server domains:`, topServerDomains);
        return topServerDomains;
    }

    private static async shouldReloadFeatures() {
        return (await this.getNumAppOpens()) % 10 == RELOAD_FEATURES_EVERY_NTH_OPEN;
    }
};


const logPrefix = (action: string) => `[MastodonApiCache] ${action}`;
