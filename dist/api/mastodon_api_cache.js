"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_mutex_1 = require("async-mutex");
const mastodon_servers_info_1 = __importDefault(require("./mastodon_servers_info"));
const followed_tags_feature_scorer_1 = __importDefault(require("../scorer/feature/followed_tags_feature_scorer"));
const interactions_scorer_1 = __importDefault(require("../scorer/feature/interactions_scorer"));
const most_favorited_accounts_scorer_1 = __importDefault(require("../scorer/feature/most_favorited_accounts_scorer"));
const most_replied_accounts_scorer_1 = __importDefault(require("../scorer/feature/most_replied_accounts_scorer"));
const retooted_users_scorer_1 = __importDefault(require("../scorer/feature/retooted_users_scorer"));
const Storage_1 = __importStar(require("../Storage"));
const toot_1 = __importDefault(require("./objects/toot"));
const account_1 = require("./objects/account");
const api_1 = require("./api");
const types_1 = require("../types");
// This doesn't quite work as advertised. It actually forces a reload every 10 app opens
// starting at the 9th one. Also bc of the way it was implemented it won't work the same
// way for any number other than 9.
const LOADED_FROM_STORAGE = "Loaded from storage";
const RETRIEVED = 'Retrieved';
class MastodonApiCache extends Storage_1.default {
    static tagPullMutex = new async_mutex_1.Mutex(); // at startup multiple calls
    // Get an array of Accounts the user is following
    static async getFollowedAccounts(api) {
        const followedAccounts = await this.getAggregatedData(api, Storage_1.Key.FOLLOWED_ACCOUNTS, api_1.MastoApi.instance.fetchFollowedAccounts.bind(api_1.MastoApi.instance));
        return (0, account_1.buildAccountNames)(followedAccounts);
    }
    static async getMostFavoritedAccounts(api) {
        return await this.getAggregatedData(api, types_1.WeightName.FAVORITED_ACCOUNTS, most_favorited_accounts_scorer_1.default.fetchRequiredData);
    }
    // Get the users recent toots
    // TODO: gets called twice in parallel during startup w/empty storage. use a mutex so second call uses cache?
    // TODO: probably shouldn't load toots from storage usually beyond a certain age (that's not long?)
    static async getRecentToots(api) {
        const recentToots = await this.getAggregatedData(api, Storage_1.Key.RECENT_TOOTS, api_1.MastoApi.instance.getUserRecentToots);
        // TODO: this rebuild of the {uri: toot} dict is done anew unnecessarily for each call to getRecentToots
        return recentToots.reduce((acc, toot) => {
            acc[toot.reblog?.uri || toot.uri] = toot;
            return acc;
        }, {});
    }
    static async getFollowedTags(api) {
        const releaseMutex = await this.tagPullMutex.acquire();
        try {
            return await this.getAggregatedData(api, types_1.WeightName.FOLLOWED_TAGS, followed_tags_feature_scorer_1.default.fetchRequiredData);
        }
        finally {
            releaseMutex();
        }
    }
    static async getMostRetootedAccounts(api) {
        return await this.getAggregatedData(api, types_1.WeightName.MOST_RETOOTED_ACCOUNTS, retooted_users_scorer_1.default.fetchRequiredData, Object.values(await this.getRecentToots(api)));
    }
    static async getMostRepliedAccounts(api) {
        return await this.getAggregatedData(api, types_1.WeightName.MOST_REPLIED_ACCOUNTS, most_replied_accounts_scorer_1.default.fetchRequiredData, Object.values(await this.getRecentToots(api)));
    }
    static async getMostFrequentlyInteractingUsers(api) {
        return await this.getAggregatedData(api, types_1.WeightName.INTERACTIONS, interactions_scorer_1.default.fetchRequiredData);
    }
    // Returns information about mastodon servers
    static async getCoreServer(api) {
        return await this.getAggregatedData(api, Storage_1.Key.CORE_SERVER, mastodon_servers_info_1.default, await this.getFollowedAccounts(api));
    }
    // Get the server names that are most relevant to the user (appears in follows a lot, mostly)
    static async getTopServerDomains(api) {
        const coreServers = await this.getCoreServer(api);
        // Count the number of followed users per server
        const topServerDomains = Object.keys(coreServers)
            .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0)
            .sort((a, b) => (coreServers[b] - coreServers[a]));
        console.log(`${logPrefix("topServerDomains")} Found top server domains:`, topServerDomains);
        return topServerDomains;
    }
    // Generic method to pull cached data from storage or fetch it from the API
    static async getAggregatedData(api, storageKey, fetch, extraArg) {
        let logAction = LOADED_FROM_STORAGE;
        const storedData = await this.get(storageKey);
        console.log(`[${storageKey}] Got stored data:`, storedData);
        let data;
        // TODO: this is a pretty horrific hack to force serialized Toots to get their functions back
        if (storageKey == Storage_1.Key.RECENT_TOOTS && storedData) {
            data = storedData;
        }
        else {
            data = storedData;
        }
        if (data == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null)
                throw new Error("No user identity found"); // TODO: user isn't always needed
            logAction = RETRIEVED;
            if (extraArg) {
                console.debug(`[${storageKey}] Calling fetch() with extraArg:`, extraArg);
                data = await fetch(api, user, extraArg);
            }
            else {
                data = await fetch(api, user);
            }
            await this.set(storageKey, data);
        }
        console.log(`${logPrefix(logAction)} ${storageKey}:`, data);
        if (storageKey == Storage_1.Key.RECENT_TOOTS && storedData)
            data = data.map(t => new toot_1.default(t));
        return data;
    }
    static async shouldReloadFeatures() {
        return (await this.getNumAppOpens()) % 10 == Storage_1.default.getConfig().reloadFeaturesEveryNthOpen;
    }
}
exports.default = MastodonApiCache;
;
const logPrefix = (action) => `[MastodonApiCache] ${action}`;
//# sourceMappingURL=mastodon_api_cache.js.map