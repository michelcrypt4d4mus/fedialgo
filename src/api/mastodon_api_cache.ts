/*
 * Handles caching of things that are slow to fetch and/or computer like the top
 * retoots, top favorites, etc.
 */
import { mastodon } from "masto";
import { Mutex } from 'async-mutex';

import mastodonServersInfo from "./mastodon_servers_info";
import FollowedTagsFeatureScorer from "../scorer/feature/followed_tags_feature_scorer";
import InteractionsScorer from "../scorer/feature/interactions_scorer";
import MostFavoritedAccountsScorer from "../scorer/feature/most_favorited_accounts_scorer";
import MostRepliedAccountsScorer from "../scorer/feature/most_replied_accounts_scorer";
import RetootedUsersScorer from "../scorer/feature/retooted_users_scorer";
import Storage, { Key } from "../Storage";
import Toot from './objects/toot';
import { AccountFeature, AccountNames, StringNumberDict, ServerFeature, StorageValue, TootExtension, TootURIs } from "../types";
import { buildAccountNames } from "./objects/account";
import { mastodonFetchPages } from "./api";
import { MastoApi } from "./api";
import { WeightName } from "../types";

// This doesn't quite work as advertised. It actually forces a reload every 10 app opens
// starting at the 9th one. Also bc of the way it was implemented it won't work the same
// way for any number other than 9.
const LOADED_FROM_STORAGE = "Loaded from storage";
const RETRIEVED = 'Retrieved';


export default class MastodonApiCache extends Storage {
    static tagPullMutex = new Mutex();  // at startup multiple calls

    // Get an array of Accounts the user is following
    static async getFollowedAccounts(api: mastodon.rest.Client): Promise<AccountNames> {
        const followedAccounts = await this.getAggregatedData<mastodon.v1.Account[]>(
            api,
            Key.FOLLOWED_ACCOUNTS,
            MastoApi.instance.fetchFollowedAccounts.bind(MastoApi.instance)
        );

        return buildAccountNames(followedAccounts);
    }

    static async getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature> {
        return await this.getAggregatedData<AccountFeature>(
            api,
            WeightName.FAVORITED_ACCOUNTS,
            MostFavoritedAccountsScorer.fetchRequiredData
        );
    }

    // Get the users recent toots
    // TODO: gets called twice in parallel during startup w/empty storage. use a mutex so second call uses cache?
    // TODO: probably shouldn't load toots from storage usually beyond a certain age (that's not long?)
    static async getRecentToots(api: mastodon.rest.Client): Promise<TootURIs> {
        const recentToots = await this.getAggregatedData<Toot[]>(
            api,
            Key.RECENT_TOOTS,
            MastoApi.instance.getUserRecentToots
        );

        // TODO: this rebuild of the {uri: toot} dict is done anew unnecessarily for each call to getRecentToots
        return recentToots.reduce((acc, toot) => {
            acc[toot.reblog?.uri || toot.uri] = toot;
            return acc;
        }, {} as TootURIs);
    }

    static async getFollowedTags(api: mastodon.rest.Client): Promise<StringNumberDict> {
        const releaseMutex = await this.tagPullMutex.acquire();

        try {
            return await this.getAggregatedData<StringNumberDict>(
                api,
                WeightName.FOLLOWED_TAGS,
                FollowedTagsFeatureScorer.fetchRequiredData
            );
        } finally {
            releaseMutex();
        }
    }

    static async getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature> {
        return await this.getAggregatedData<AccountFeature>(
            api,
            WeightName.MOST_RETOOTED_ACCOUNTS,
            RetootedUsersScorer.fetchRequiredData,
            Object.values(await this.getRecentToots(api))
        );
    }

    static async getMostRepliedAccounts(api: mastodon.rest.Client): Promise<StringNumberDict> {
        return await this.getAggregatedData<StringNumberDict>(
            api,
            WeightName.MOST_REPLIED_ACCOUNTS,
            MostRepliedAccountsScorer.fetchRequiredData,
            Object.values(await this.getRecentToots(api))
        );
    }

    static async getMostFrequentlyInteractingUsers(api: mastodon.rest.Client): Promise<AccountFeature> {
        return await this.getAggregatedData<AccountFeature>(
            api,
            WeightName.INTERACTIONS,
            InteractionsScorer.fetchRequiredData
        );
    }

    // Returns information about mastodon servers
    static async getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature> {
        return await this.getAggregatedData<AccountFeature>(
            api,
            Key.CORE_SERVER,
            mastodonServersInfo,
            await this.getFollowedAccounts(api)
        );
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

    // Generic method to pull cached data from storage or fetch it from the API
    private static async getAggregatedData<T>(
        api: mastodon.rest.Client,
        storageKey: Key | WeightName,
        fetch: (api: mastodon.rest.Client, user: mastodon.v1.Account, ...args: any) => Promise<T>,
        extraArg?: any
    ): Promise<T> {
        let logAction = LOADED_FROM_STORAGE;
        const storedData = await this.get(storageKey);
        console.log(`[${storageKey}] Got stored data:`, storedData);
        let data;

        // TODO: this is a pretty horrific hack to force serialized Toots to get their functions back
        if (storageKey == Key.RECENT_TOOTS && storedData) {
            data = storedData as TootExtension[];
        } else {
            data = storedData as T;
        }

        if (data == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null) throw new Error("No user identity found"); // TODO: user isn't always needed
            logAction = RETRIEVED;

            if (extraArg) {
                console.debug(`[${storageKey}] Calling fetch() with extraArg:`, extraArg);
                data = await fetch(api, user, extraArg);
            } else {
                data = await fetch(api, user);
            }

            await this.set(storageKey, data as StorageValue);
        }

        console.log(`${logPrefix(logAction)} ${storageKey}:`, data);
        if (storageKey == Key.RECENT_TOOTS && storedData) data = (data as TootExtension[]).map(t => new Toot(t)) as T
        return data as T;
    }

    private static async shouldReloadFeatures() {
        return (await this.getNumAppOpens()) % 10 == Storage.getConfig().reloadFeaturesEveryNthOpen;
    }
};


const logPrefix = (action: string) => `[MastodonApiCache] ${action}`;
