/*
 * Handles caching of things that are slow to fetch and/or computer like the top
 * retoots, top favorites, etc.
 */
import { mastodon } from "masto";

import coreServerFeature from "./coreServerFeature";
import FavsFeature from "./favsFeature";
import FollowedTagsFeature from "./followed_tags_feature";
import InteractionsFeature from "./InteractionsFeature";
import reblogsFeature, { getUserRecentToots } from "./reblogsFeature";
import repliedFeature from "./replied_feature";
import Storage, { Key } from "../Storage";
import { AccountFeature, StringNumberDict, ServerFeature, TootURIs } from "../types";

// This doesn't quite work as advertised. It actually forces a reload every 10 app opens
// starting at the 9th one. Also bc of the way it was implemented it won't work the same
// way for any number other than 9.
const RELOAD_FEATURES_EVERY_NTH_OPEN = 9;


export default class MastodonApiCache extends Storage {
    static async getMostFavoritedAccounts(api: mastodon.rest.Client): Promise<AccountFeature> {
        let topFavs: AccountFeature = await this.get(Key.TOP_FAVS) as AccountFeature;

        if (topFavs != null && !this.shouldReloadFeatures()) {
            console.log("[MastodonApiCache] Loaded accounts user has favorited the most from storage...");
        } else {
            topFavs = await FavsFeature(api);
            await this.set(Key.TOP_FAVS, topFavs);
        }

        console.log("[MastodonApiCache] Accounts user has favorited the most", topFavs);
        return topFavs;
    }

    // Get the users recent toots
    // TODO: probably shouldn't load these from storage usually?
    static async getRecentToots(api: mastodon.rest.Client): Promise<TootURIs> {
        let recentTootURIs: TootURIs = await this.get(Key.RECENT_TOOTS) as TootURIs;

        if (recentTootURIs != null && !this.shouldReloadFeatures()) {
            console.log("[MastodonApiCache] Loaded user's toots from storage...");
        } else {
            const user = await this.getIdentity();
            if (user == null) throw new Error("No user identity found");
            const recentToots = await getUserRecentToots(api, user);
            console.log(`[MastodonApiCache] Retrieved recentToots: `, recentToots);

            recentTootURIs = recentToots.reduce((acc, toot) => {
                acc[toot.reblog?.uri || toot.uri] = toot;
                return acc;
            }, {} as TootURIs);

            await this.set(Key.RECENT_TOOTS, recentTootURIs);
        }

        console.log("[MastodonApiCache] User's recent toot URIs", Object.values(recentTootURIs));
        return recentTootURIs;
    }

    static async getMostRetootedAccounts(api: mastodon.rest.Client): Promise<AccountFeature> {
        let topReblogs: AccountFeature = await this.get(Key.TOP_REBLOGS) as AccountFeature;

        if (topReblogs != null && !this.shouldReloadFeatures()) {
            console.log("[MastodonApiCache] Loaded accounts user has reooted the most from storage...");
        } else {
            const user = await this.getIdentity();
            if (user == null) throw new Error("No user identity found");
            topReblogs = await reblogsFeature(api, user, Object.values(await this.getRecentToots(api)));
            await this.set(Key.TOP_REBLOGS, topReblogs);
        }

        console.log("[MastodonApiCache] Accounts user has retooted the most", topReblogs);
        return topReblogs;
    }

    static async getMostRepliedAccounts(api: mastodon.rest.Client): Promise<StringNumberDict> {
        let mostReplied: StringNumberDict = await this.get(Key.REPLIED_TO) as StringNumberDict;

        if (mostReplied != null && !this.shouldReloadFeatures()) {
            console.log("[MastodonApiCache] Loaded replied to accounts from storage...");
        } else {
            const user = await this.getIdentity();
            if (user == null) throw new Error("No user identity found");
            mostReplied = await repliedFeature(api, user, Object.values(await this.getRecentToots(api)));
            await this.set(Key.REPLIED_TO, mostReplied);
        }

        console.log("[MastodonApiCache] Accounts user has replied to the most", mostReplied);
        return mostReplied;
    }

    static async getTopInteracts(api: mastodon.rest.Client): Promise<AccountFeature> {
        let topInteracts: AccountFeature = await this.get(Key.TOP_INTERACTS) as AccountFeature;

        if (topInteracts != null && !this.shouldReloadFeatures()) {
            console.log("[MastodonApiCache] Loaded accounts that have interacted the most with user's toots from storage");
        } else {
            topInteracts = await InteractionsFeature(api);
            await this.set(Key.TOP_INTERACTS, topInteracts);
        }

        console.log("[MastodonApiCache] Accounts that have interacted the most with user's toots", topInteracts);
        return topInteracts;
    }

    static async getFollowedTags(api: mastodon.rest.Client): Promise<StringNumberDict> {
        let followedTags: StringNumberDict = await this.get(Key.FOLLOWED_TAGS) as StringNumberDict;

        if (followedTags != null && !this.shouldReloadFeatures()) {
            console.log("[MastodonApiCache] Loaded followed tags from storage");
        } else {
            followedTags = await FollowedTagsFeature(api);
            await this.set(Key.FOLLOWED_TAGS, followedTags);
        }

        console.log("[MastodonApiCache] Followed tags", followedTags);
        return followedTags;
    }

    // Returns information about mastodon servers
    static async getCoreServer(api: mastodon.rest.Client): Promise<ServerFeature> {
        let coreServer: ServerFeature = await this.get(Key.CORE_SERVER) as ServerFeature;

        if (coreServer != null && await this.getNumAppOpens() % 10 != 9) {
            console.log("[MastodonApiCache] Loaded coreServer from storage");
        } else {
            const user = await this.getIdentity();
            if (user == null) throw new Error("No user identity found");
            coreServer = await coreServerFeature(api, user);
            await this.set(Key.CORE_SERVER, coreServer);
        }

        console.log("[MastodonApiCache] getCoreServer() info: ", coreServer);
        return coreServer;
    }

    private static async shouldReloadFeatures() {
        return (await this.getNumAppOpens()) % 10 == RELOAD_FEATURES_EVERY_NTH_OPEN;
    }
};
