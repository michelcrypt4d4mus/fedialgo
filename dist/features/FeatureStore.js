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
const InteractionsFeature_1 = __importDefault(require("./InteractionsFeature"));
const reblogsFeature_1 = __importStar(require("./reblogsFeature"));
const Storage_1 = __importStar(require("../Storage"));
// This doesn't quite work as advertised. It actually forces a reload every 10 app opens
// starting at the 9th one. Also bc of the way it was implemented it won't work the same
// way for any number other than 9.
const RELOAD_FEATURES_EVERY_NTH_OPEN = 9;
class FeatureStorage extends Storage_1.default {
    static async getMostFavoritedAccounts(api) {
        let topFavs = await this.get(Storage_1.Key.TOP_FAVS);
        if (topFavs != null && await this.getNumAppOpens() % 10 < RELOAD_FEATURES_EVERY_NTH_OPEN) {
            console.log("[FeatureStorage] Loaded accounts user has favorited the most from storage...");
        }
        else {
            topFavs = await (0, favsFeature_1.default)(api);
            await this.set(Storage_1.Key.TOP_FAVS, topFavs);
        }
        console.log("[FeatureStorage] Accounts user has favorited the most", topFavs);
        return topFavs;
    }
    // Get the users recent toots
    // TODO: probably shouldn't load these from storage usually?
    static async getRecentToots(api) {
        let recentTootURIs = await this.get(Storage_1.Key.RECENT_TOOTS);
        if (recentTootURIs != null && await this.getNumAppOpens() % 10 < RELOAD_FEATURES_EVERY_NTH_OPEN) {
            console.log("[FeatureStorage] Loaded user's toots from storage...");
        }
        else {
            const user = await this.getIdentity();
            const recentToots = await (0, reblogsFeature_1.getUserRecentToots)(api, user);
            console.log(`[FeatureStorage] Retrieved recentToots: `, recentToots);
            recentTootURIs = recentToots.reduce((acc, toot) => {
                acc[toot.reblog?.uri || toot.uri] = toot;
                return acc;
            }, {});
            await this.set(Storage_1.Key.RECENT_TOOTS, recentTootURIs);
        }
        console.log("[FeatureStorage] User's recent toot URIs", Object.values(recentTootURIs));
        return recentTootURIs;
    }
    static async getMostRetootedAccounts(api) {
        let topReblogs = await this.get(Storage_1.Key.TOP_REBLOGS);
        if (topReblogs != null && await this.getNumAppOpens() % 10 < RELOAD_FEATURES_EVERY_NTH_OPEN) {
            console.log("[FeatureStorage] Loaded accounts user has reooted the most from storage...");
        }
        else {
            const user = await this.getIdentity();
            topReblogs = await (0, reblogsFeature_1.default)(api, user, Object.values(await this.getRecentToots(api)));
            await this.set(Storage_1.Key.TOP_REBLOGS, topReblogs);
        }
        console.log("[FeatureStorage] Accounts user has retooted the most", topReblogs);
        return topReblogs;
    }
    static async getTopInteracts(api) {
        let topInteracts = await this.get(Storage_1.Key.TOP_INTERACTS);
        if (topInteracts != null && await this.getNumAppOpens() % 10 < RELOAD_FEATURES_EVERY_NTH_OPEN) {
            console.log("[FeatureStorage] Loaded accounts that have interacted the most with user's toots from storage");
        }
        else {
            topInteracts = await (0, InteractionsFeature_1.default)(api);
            await this.set(Storage_1.Key.TOP_INTERACTS, topInteracts);
        }
        console.log("[FeatureStorage] Accounts that have interacted the most with user's toots", topInteracts);
        return topInteracts;
    }
    // Returns information about mastodon servers
    static async getCoreServer(api) {
        let coreServer = await this.get(Storage_1.Key.CORE_SERVER);
        if (coreServer != null && await this.getNumAppOpens() % 10 != 9) {
            console.log("[FeatureStorage] Loaded coreServer from storage");
        }
        else {
            const user = await this.getIdentity();
            coreServer = await (0, coreServerFeature_1.default)(api, user);
            await this.set(Storage_1.Key.CORE_SERVER, coreServer);
        }
        console.log("[FeatureStorage] getCoreServer() info: ", coreServer);
        return coreServer;
    }
}
exports.default = FeatureStorage;
;
//# sourceMappingURL=FeatureStore.js.map