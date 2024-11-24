import { mastodon } from "masto";

import coreServerFeature from "./coreServerFeature";
import FavsFeature from "./favsFeature";
import interactsFeature from "./interactsFeature";
import reblogsFeature from "./reblogsFeature";
import Storage, { Key } from "../Storage";
import { ServerFeature, AccountFeature } from "../types";

const RELOAD_FEATURES_EVERY_NTH_OPEN = 9;


export default class FeatureStorage extends Storage {
    static async getTopFavs(api: mastodon.rest.Client): Promise<AccountFeature> {
        let topFavs: AccountFeature = await this.get(Key.TOP_FAVS) as AccountFeature;

        if (topFavs != null && await this.getNumAppOpens() % 10 < RELOAD_FEATURES_EVERY_NTH_OPEN) {
            console.log("Loaded accounts user has favorited the most from storage...");
        } else {
            topFavs = await FavsFeature(api);
            await this.set(Key.TOP_FAVS, topFavs);
        }

        console.log("[Feature] Accounts user has favorited the most", topFavs);
        return topFavs;
    }

    static async getTopReblogs(api: mastodon.rest.Client): Promise<AccountFeature> {
        let topReblogs: AccountFeature = await this.get(Key.TOP_REBLOGS) as AccountFeature;

        if (topReblogs != null && await this.getNumAppOpens() % 10 < RELOAD_FEATURES_EVERY_NTH_OPEN) {
            console.log("Loaded accounts user has reooted the most from storage...");
        } else {
            const user = await this.getIdentity();
            topReblogs = await reblogsFeature(api, user);
            await this.set(Key.TOP_REBLOGS, topReblogs);
        }

        console.log("[Feature] Accounts user has retooted the most", topReblogs);
        return topReblogs;
    }

    static async getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature> {
        let topInteracts: AccountFeature = await this.get(Key.TOP_INTERACTS) as AccountFeature;

        if (topInteracts != null && await this.getNumAppOpens() % 10 < RELOAD_FEATURES_EVERY_NTH_OPEN) {
            console.log("[Storage] Accounts that have interacted the most with user's toots");
        } else {
            topInteracts = await interactsFeature(api);
            await this.set(Key.TOP_INTERACTS, topInteracts);
        }

        console.log("[Featuer] Accounts that have interacted the most with user's toots", topInteracts);
        return topInteracts;
    }

    // Returns information about mastodon servers
    static async getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature> {
        let coreServer: ServerFeature = await this.get(Key.CORE_SERVER) as ServerFeature;

        if (coreServer != null && await this.getNumAppOpens() % 10 != 9) {
            console.log("Loaded coreServer from storage");
        } else {
            console.log("Fetching coreServer info...");
            const user = await this.getIdentity();
            coreServer = await coreServerFeature(api, user);
            await this.set(Key.CORE_SERVER, coreServer);
        }

        console.log("coreServer info: ", coreServer);
        return coreServer;
    }
};
