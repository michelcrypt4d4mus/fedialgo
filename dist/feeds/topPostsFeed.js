"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FeatureStore_1 = __importDefault(require("../features/FeatureStore"));
const Storage_1 = __importDefault(require("../Storage"));
const helpers_1 = require("../helpers");
const NUM_HOURS_BEFORE_REFRESH = 8;
const NUM_SERVERS_TO_POLL = 10;
const NUM_TOP_POSTS_PER_SERVER = 10;
async function topPostsFeed(api) {
    const core_servers = await FeatureStore_1.default.getCoreServer(api);
    let results = [];
    // Get list of top mastodon servers // TODO: what does "top" mean here?
    const servers = Object.keys(core_servers)
        .sort((a, b) => (core_servers[b] - core_servers[a])) // TODO: wtf is this comparison?
        .filter(s => s !== "undefined" && typeof s !== "undefined" && s.length > 0) // Remove weird records
        .slice(0, NUM_SERVERS_TO_POLL);
    if (servers.length === 0) {
        console.warn("No mastodon servers found to get topPostsFeed data from!");
        return [];
    }
    else {
        servers.forEach(s => console.log(`Found mastodon server: `, s));
    }
    results = await Promise.all(servers.map(async (server) => {
        if (server === "undefined" || typeof server == "undefined" || server === "")
            return [];
        const data = await (0, helpers_1.mastodonFetch)(server, "api/v1/trends/statuses");
        if (!data)
            throw new Error(`Failed to get top toots from server ${server}: ${JSON.stringify(data, null, 4)}`);
        return data.filter(status => status?.favouritesCount > 0 || status?.reblogsCount > 0)
            .map((status, i) => {
            status.topPost = true; // Add a topPost property to the status
            return status;
        })
            .slice(0, NUM_TOP_POSTS_PER_SERVER) ?? [];
    }));
    console.log(`topPostsFeed results:`, results);
    const lastOpened = new Date((await Storage_1.default.getLastOpened() ?? 0) - 28800000);
    return results.flat().filter((status) => new Date(status.createdAt) > lastOpened).map((status) => {
        const acct = status.account.acct;
        if (acct && !acct.includes("@")) {
            status.account.acct = `${acct}@${status.account.url.split("/")[2]}`;
        }
        return status;
    });
}
exports.default = topPostsFeed;
