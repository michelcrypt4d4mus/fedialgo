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
import repliedFeature from "../features/replied_feature";
import Storage, { Key } from "../Storage";
import { AccountFeature, AccountNames, StringNumberDict, ServerFeature, StorageValue, Toot, TootURIs } from "../types";
import { buildAccountNames } from "../objects/account";
import { getUserRecentToots, mastodonFetchPages } from "./api";

// This doesn't quite work as advertised. It actually forces a reload every 10 app opens
// starting at the 9th one. Also bc of the way it was implemented it won't work the same
// way for any number other than 9.
const MAX_FOLLOWING_ACCOUNT_TO_PULL = 5_000;
const RELOAD_FEATURES_EVERY_NTH_OPEN = 9;
const LOADED_FROM_STORAGE = "Loaded from storage";
const RETRIEVED = 'Retrieved';

// type StringOrNumberFunction<
//     Inputs extends (string | number)[],
//     Output = void,
// > = (...args: Inputs) => Output;


export default class MastodonApiCache extends Storage {
    // Get an array of Accounts the user is following
    static async getFollowedAccounts(api: mastodon.rest.Client): Promise<AccountNames> {
        const fetchFollows = async (_api: mastodon.rest.Client, _user: mastodon.v1.Account) => {
            return await mastodonFetchPages<mastodon.v1.Account>({
                fetchMethod: _api.v1.accounts.$select(_user.id).following.list,
                maxRecords: MAX_FOLLOWING_ACCOUNT_TO_PULL,
                label: 'followedAccounts'
            });
        };

        let followedAccounts = await this.getAggregatedData<mastodon.v1.Account[]>(
            api,
            Key.FOLLOWED_ACCOUNTS,
            fetchFollows
        );

        return buildAccountNames(followedAccounts);
    }

    static async getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature> {
        return await this.getAggregatedData<AccountFeature>(api, Key.TOP_FAVS, FavsFeature);
    }

    // Get the users recent toots
    // TODO: gets called twice in parallel during startup w/empty storage. use a mutex so second call uses cache?
    // TODO: probably shouldn't load toots from storage usually beyond a certain age (that's not long?)
    static async getRecentToots(api: mastodon.rest.Client): Promise<TootURIs> {
        const recentToots = await this.getAggregatedData<Toot[]>(api, Key.RECENT_TOOTS, getUserRecentToots);

        // TODO: this rebuild of the {uri: toot} dict is done anew unnecessarily for each call to getRecentToots
        return recentToots.reduce((acc, toot) => {
            acc[toot.reblog?.uri || toot.uri] = toot;
            return acc;
        }, {} as TootURIs);
    }

    static async getFollowedTags(api: mastodon.rest.Client): Promise<StringNumberDict> {
        return await this.getAggregatedData<AccountFeature>(api, Key.FOLLOWED_TAGS, FollowedTagsFeature);
    }

    static async getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature> {
        return await this.getAggregatedData<AccountFeature>(
            api,
            Key.TOP_REBLOGS,
            reblogsFeature,
            Object.values(await this.getRecentToots(api))
        );
    }

    static async getMostRepliedAccounts(api: mastodon.rest.Client): Promise<StringNumberDict> {
        return await this.getAggregatedData<StringNumberDict>(
            api,
            Key.REPLIED_TO,
            repliedFeature,
            Object.values(await this.getRecentToots(api))
        );
    }

    static async getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature> {
        return await this.getAggregatedData<AccountFeature>(api, Key.TOP_INTERACTS, InteractionsFeature);
    }

    // Generic method to pull cached data from storage or fetch it from the API
    static async getAggregatedData<T>(
        api: mastodon.rest.Client,
        storageKey: Key,
        fetchMethod: (api: mastodon.rest.Client, user: mastodon.v1.Account, ...args: any | null) => Promise<T>,
        extraArg: any | null = null
    ): Promise<T> {
        let data: T = await this.get(storageKey) as T;
        let logAction = LOADED_FROM_STORAGE;

        if (data == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null) throw new Error("No user identity found"); // TODO: user isn't always needed
            logAction = RETRIEVED;

            if (extraArg) {
                console.log(`Calling fetchMethod() with extraArg for ${storageKey}:`, extraArg);
                data = await fetchMethod(api, user, extraArg);
            } else {
                data = await fetchMethod(api, user);
            }

            await this.set(storageKey, data as StorageValue);
        }

        console.log(`${logPrefix(logAction)} ${storageKey}:`, data);
        return data;
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
