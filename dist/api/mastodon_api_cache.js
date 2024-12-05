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
const coreServerFeature_1 = __importDefault(require("../features/coreServerFeature"));
const followed_tags_feature_1 = __importDefault(require("../features/followed_tags_feature"));
const InteractionsFeature_1 = __importDefault(require("../features/InteractionsFeature"));
const most_favorited_accounts_1 = __importDefault(require("../features/most_favorited_accounts"));
const reblogsFeature_1 = __importDefault(require("../features/reblogsFeature"));
const replied_feature_1 = __importDefault(require("../features/replied_feature"));
const Storage_1 = __importStar(require("../Storage"));
const account_1 = require("../objects/account");
const api_1 = require("./api");
const types_1 = require("../types");
// This doesn't quite work as advertised. It actually forces a reload every 10 app opens
// starting at the 9th one. Also bc of the way it was implemented it won't work the same
// way for any number other than 9.
const LOADED_FROM_STORAGE = "Loaded from storage";
const RETRIEVED = 'Retrieved';
class MastodonApiCache extends Storage_1.default {
    // Get an array of Accounts the user is following
    static async getFollowedAccounts(api) {
        const fetchFollows = async (_api, _user) => {
            return await (0, api_1.mastodonFetchPages)({
                fetch: _api.v1.accounts.$select(_user.id).following.list,
                maxRecords: Storage_1.default.getConfig().maxFollowingAccountsToPull,
                label: 'followedAccounts'
            });
        };
        const followedAccounts = await this.getAggregatedData(api, Storage_1.Key.FOLLOWED_ACCOUNTS, fetchFollows);
        return (0, account_1.buildAccountNames)(followedAccounts);
    }
    static async getMostFavoritedAccounts(api) {
        return await this.getAggregatedData(api, types_1.WeightName.FAVORITED_ACCOUNTS, most_favorited_accounts_1.default);
    }
    // Get the users recent toots
    // TODO: gets called twice in parallel during startup w/empty storage. use a mutex so second call uses cache?
    // TODO: probably shouldn't load toots from storage usually beyond a certain age (that's not long?)
    static async getRecentToots(api) {
        const recentToots = await this.getAggregatedData(api, Storage_1.Key.RECENT_TOOTS, api_1.getUserRecentToots);
        // TODO: this rebuild of the {uri: toot} dict is done anew unnecessarily for each call to getRecentToots
        return recentToots.reduce((acc, toot) => {
            acc[toot.reblog?.uri || toot.uri] = toot;
            return acc;
        }, {});
    }
    static async getFollowedTags(api) {
        return await this.getAggregatedData(api, types_1.WeightName.FOLLOWED_TAGS, followed_tags_feature_1.default);
    }
    static async getMostRetootedAccounts(api) {
        return await this.getAggregatedData(api, types_1.WeightName.MOST_RETOOTED_ACCOUNTS, reblogsFeature_1.default, Object.values(await this.getRecentToots(api)));
    }
    static async getMostRepliedAccounts(api) {
        return await this.getAggregatedData(api, types_1.WeightName.MOST_REPLIED_ACCOUNTS, replied_feature_1.default, Object.values(await this.getRecentToots(api)));
    }
    static async getTopInteracts(api) {
        return await this.getAggregatedData(api, types_1.WeightName.INTERACTIONS, InteractionsFeature_1.default);
    }
    // Returns information about mastodon servers
    static async getCoreServer(api) {
        return await this.getAggregatedData(api, Storage_1.Key.CORE_SERVER, coreServerFeature_1.default, await this.getFollowedAccounts(api));
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
    static async getAggregatedData(api, storageKey, fetch, extraArg = null) {
        let data = await this.get(storageKey);
        let logAction = LOADED_FROM_STORAGE;
        if (data == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null)
                throw new Error("No user identity found"); // TODO: user isn't always needed
            logAction = RETRIEVED;
            if (extraArg) {
                console.debug(`Calling fetch() with extraArg for ${storageKey}:`, extraArg);
                data = await fetch(api, user, extraArg);
            }
            else {
                data = await fetch(api, user);
            }
            await this.set(storageKey, data);
        }
        console.log(`${logPrefix(logAction)} ${storageKey}:`, data);
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