import { mastodon } from "masto";

import coreServerFeature from "./coreServerFeature";
import FavsFeature from "./favsFeature";
import interactsFeature from "./interactsFeature";
import reblogsFeature from "./reblogsFeature";
import Storage, { Key } from "../Storage";
import { ServerFeature, AccountFeature } from "../types";


export default class FeatureStorage extends Storage {
    static async getTopFavs(api: mastodon.rest.Client): Promise<AccountFeature> {
        const topFavs: AccountFeature = await this.get(Key.TOP_FAVS) as AccountFeature;
        console.log("[Storage] Accounts user has favorited the most in the past", topFavs);

        if (topFavs != null && await this.getOpenings() % 10 < 9) {
            return topFavs;
        } else {
            const favs = await FavsFeature(api);
            await this.set(Key.TOP_FAVS, favs);
            return favs;
        }
    }

    static async getTopReblogs(api: mastodon.rest.Client): Promise<AccountFeature> {
        const topReblogs: AccountFeature = await this.get(Key.TOP_REBLOGS) as AccountFeature;
        console.log("[Storage] Accounts user has retooted the most in the past", topReblogs);

        if (topReblogs != null && await this.getOpenings() % 10 < 9) {
            return topReblogs;
        } else {
            const user = await this.getIdentity()
            const reblogs = await reblogsFeature(api, user);
            await this.set(Key.TOP_REBLOGS, reblogs);
            return reblogs;
        }
    }

    static async getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature> {
        const topInteracts: AccountFeature = await this.get(Key.TOP_INTERACTS) as AccountFeature;
        console.log("[Storage] Accounts that have interacted the most with user's toots", topInteracts);

        if (topInteracts != null && await this.getOpenings() % 10 < 9) {
            return topInteracts;
        } else {
            const interacts = await interactsFeature(api);
            await this.set(Key.TOP_INTERACTS, interacts);
            return interacts;
        }
    }

    // Returns the Mastodon server the user is currently logged in to
    static async getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature> {
        const coreServer: ServerFeature = await this.get(Key.CORE_SERVER) as ServerFeature;
        console.log("[Storage] coreServer", coreServer);

        if (coreServer != null && await this.getOpenings() % 10 != 9) {
            return coreServer;
        } else {
            const user = await this.getIdentity();
            const server = await coreServerFeature(api, user);
            await this.set(Key.CORE_SERVER, server);
            return server;
        }
    }
};
