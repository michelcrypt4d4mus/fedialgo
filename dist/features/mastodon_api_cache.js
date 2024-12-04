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
const coreServerFeature_1 = __importDefault(require("./coreServerFeature"));
const favsFeature_1 = __importDefault(require("./favsFeature"));
const followed_tags_feature_1 = __importDefault(require("./followed_tags_feature"));
const InteractionsFeature_1 = __importDefault(require("./InteractionsFeature"));
const reblogsFeature_1 = __importStar(require("./reblogsFeature"));
const replied_feature_1 = __importDefault(require("./replied_feature"));
const Storage_1 = __importStar(require("../Storage"));
const api_1 = require("../api");
// This doesn't quite work as advertised. It actually forces a reload every 10 app opens
// starting at the 9th one. Also bc of the way it was implemented it won't work the same
// way for any number other than 9.
const MAX_FOLLOWING_ACCOUNT_TO_PULL = 5000;
const RELOAD_FEATURES_EVERY_NTH_OPEN = 9;
const LOADED_FROM_STORAGE = "Loaded from storage";
const RETRIEVED = 'Retrieved';
class MastodonApiCache extends Storage_1.default {
    // Get an array of Accounts the user is following
    static async getFollowedAccounts(api) {
        let followedAccounts = await this.getFollowedAccts();
        let logAction = LOADED_FROM_STORAGE;
        if (followedAccounts == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null)
                throw new Error("Error getting followed accounts (no user identity found)");
            const accounts = await (0, api_1.mastodonFetchPages)({
                fetchMethod: api.v1.accounts.$select(user.id).following.list,
                maxRecords: MAX_FOLLOWING_ACCOUNT_TO_PULL,
                label: 'followedAccounts'
            });
            followedAccounts = accounts.reduce((accountNames, account) => {
                accountNames[account.acct] = account;
                return accountNames;
            }, {});
            logAction = RETRIEVED;
            await this.set(Storage_1.Key.FOLLOWED_ACCOUNTS, followedAccounts);
        }
        console.log(`${logPrefix(logAction)} followed accounts:`, followedAccounts);
        return followedAccounts;
    }
    static async getMostFavoritedAccounts(api) {
        let topFavs = await this.get(Storage_1.Key.TOP_FAVS);
        let logAction = LOADED_FROM_STORAGE;
        if (topFavs == null || (await this.shouldReloadFeatures())) {
            topFavs = await (0, favsFeature_1.default)(api);
            logAction = RETRIEVED;
            await this.set(Storage_1.Key.TOP_FAVS, topFavs);
        }
        console.log(`${logPrefix(logAction)} Accounts user has favorited the most:`, topFavs);
        return topFavs;
    }
    // Get the users recent toots // TODO: probably shouldn't load these from storage usually?
    static async getRecentToots(api) {
        let recentTootURIs = await this.get(Storage_1.Key.RECENT_TOOTS);
        let logAction = LOADED_FROM_STORAGE;
        if (recentTootURIs == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null)
                throw new Error("Error getting recent toots (no user identity found)");
            const recentToots = await (0, reblogsFeature_1.getUserRecentToots)(api, user);
            recentTootURIs = recentToots.reduce((acc, toot) => {
                acc[toot.reblog?.uri || toot.uri] = toot;
                return acc;
            }, {});
            logAction = RETRIEVED;
            await this.set(Storage_1.Key.RECENT_TOOTS, recentTootURIs);
        }
        console.log(`${logPrefix(logAction)} User's recent toot URIs:`, recentTootURIs);
        return recentTootURIs;
    }
    static async getMostRetootedAccounts(api) {
        let topReblogs = await this.get(Storage_1.Key.TOP_REBLOGS);
        let logAction = LOADED_FROM_STORAGE;
        if (topReblogs == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null)
                throw new Error("No user identity found");
            topReblogs = await (0, reblogsFeature_1.default)(api, user, Object.values(await this.getRecentToots(api)));
            logAction = RETRIEVED;
            await this.set(Storage_1.Key.TOP_REBLOGS, topReblogs);
        }
        console.log(`${logPrefix(logAction)} User's most retooted accounts:`, topReblogs);
        return topReblogs;
    }
    static async getMostRepliedAccounts(api) {
        let mostReplied = await this.get(Storage_1.Key.REPLIED_TO);
        let logAction = LOADED_FROM_STORAGE;
        if (mostReplied == null || (await this.shouldReloadFeatures())) {
            const user = await this.getIdentity();
            if (user == null)
                throw new Error("No user identity found");
            mostReplied = await (0, replied_feature_1.default)(api, user, Object.values(await this.getRecentToots(api)));
            logAction = RETRIEVED;
            await this.set(Storage_1.Key.REPLIED_TO, mostReplied);
        }
        console.log(`${logPrefix(logAction)} Accounts user has replied to:`, mostReplied);
        return mostReplied;
    }
    static async getTopInteracts(api) {
        let topInteracts = await this.get(Storage_1.Key.TOP_INTERACTS);
        let logAction = LOADED_FROM_STORAGE;
        if (topInteracts == null || (await this.shouldReloadFeatures())) {
            topInteracts = await (0, InteractionsFeature_1.default)(api);
            logAction = RETRIEVED;
            await this.set(Storage_1.Key.TOP_INTERACTS, topInteracts);
        }
        console.log(`${logPrefix(logAction)} Accounts that have interacted the most with user:`, topInteracts);
        return topInteracts;
    }
    static async getFollowedTags(api) {
        let followedTags = await this.get(Storage_1.Key.FOLLOWED_TAGS);
        let logAction = LOADED_FROM_STORAGE;
        if (followedTags == null || (await this.shouldReloadFeatures())) {
            followedTags = await (0, followed_tags_feature_1.default)(api);
            logAction = RETRIEVED;
            await this.set(Storage_1.Key.FOLLOWED_TAGS, followedTags);
        }
        console.log(`${logPrefix(logAction)} Followed tags`, followedTags);
        return followedTags;
    }
    // Returns information about mastodon servers
    static async getCoreServer(api) {
        let coreServer = await this.get(Storage_1.Key.CORE_SERVER);
        let logAction = LOADED_FROM_STORAGE;
        if (coreServer == null || (await this.shouldReloadFeatures())) {
            coreServer = await (0, coreServerFeature_1.default)(await this.getFollowedAccounts(api));
            logAction = RETRIEVED;
            await this.set(Storage_1.Key.CORE_SERVER, coreServer);
        }
        console.log(`${logPrefix(logAction)} coreServer`, coreServer);
        return coreServer;
    }
    static async shouldReloadFeatures() {
        return (await this.getNumAppOpens()) % 10 == RELOAD_FEATURES_EVERY_NTH_OPEN;
    }
}
exports.default = MastodonApiCache;
;
const logPrefix = (action) => `[MastodonApiCache] ${action}`;
//# sourceMappingURL=mastodon_api_cache.js.map