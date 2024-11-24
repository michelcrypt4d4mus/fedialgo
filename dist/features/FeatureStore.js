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
const interactsFeature_1 = __importDefault(require("./interactsFeature"));
const reblogsFeature_1 = __importDefault(require("./reblogsFeature"));
const Storage_1 = __importStar(require("../Storage"));
class FeatureStorage extends Storage_1.default {
    static async getTopFavs(api) {
        const topFavs = await this.get(Storage_1.Key.TOP_FAVS);
        console.log("[Storage] Accounts user has favorited the most in the past", topFavs);
        if (topFavs != null && await this.getNumAppOpens() % 10 < 9) {
            return topFavs;
        }
        else {
            const favs = await (0, favsFeature_1.default)(api);
            console.log("[NEW] Favorite accounts", favs);
            await this.set(Storage_1.Key.TOP_FAVS, favs);
            return favs;
        }
    }
    static async getTopReblogs(api) {
        const topReblogs = await this.get(Storage_1.Key.TOP_REBLOGS);
        if (topReblogs != null && await this.getNumAppOpens() % 10 < 9) {
            console.log("[Storage] Accounts user has retooted the most", topReblogs);
            return topReblogs;
        }
        else {
            const user = await this.getIdentity();
            const reblogs = await (0, reblogsFeature_1.default)(api, user);
            console.log("[NEW] Accounts user has retooted the most", reblogs);
            await this.set(Storage_1.Key.TOP_REBLOGS, reblogs);
            return reblogs;
        }
    }
    static async getTopInteracts(api) {
        const topInteracts = await this.get(Storage_1.Key.TOP_INTERACTS);
        if (topInteracts != null && await this.getNumAppOpens() % 10 < 9) {
            console.log("[Storage] Accounts that have interacted the most with user's toots", topInteracts);
            return topInteracts;
        }
        else {
            const interacts = await (0, interactsFeature_1.default)(api);
            console.log("[NEW] Accounts that have interacted the most with user's toots", interacts);
            await this.set(Storage_1.Key.TOP_INTERACTS, interacts);
            return interacts;
        }
    }
    // Returns information about mastodon servers
    static async getCoreServer(api) {
        const coreServer = await this.get(Storage_1.Key.CORE_SERVER);
        if (coreServer != null && await this.getNumAppOpens() % 10 != 9) {
            console.log("[Storage] coreServer", coreServer);
            return coreServer;
        }
        else {
            const user = await this.getIdentity();
            const server = await (0, coreServerFeature_1.default)(api, user);
            console.log("[NEW] coreServer", coreServer);
            await this.set(Storage_1.Key.CORE_SERVER, server);
            return server;
        }
    }
}
exports.default = FeatureStorage;
;
//# sourceMappingURL=FeatureStore.js.map