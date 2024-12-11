"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const mastodon_server_1 = __importDefault(require("../../api/mastodon_server"));
const Storage_1 = __importDefault(require("../../Storage"));
const types_1 = require("../../types");
class TrendingLinksScorer extends feature_scorer_1.default {
    linkData = {};
    constructor() {
        super(types_1.WeightName.TRENDING_LINKS);
    }
    async featureGetter() {
        const links = await mastodon_server_1.default.fediverseTrendingLinks();
        const trendingLinks = links.map(decorateTrendingLink);
        this.linkData = trendingLinks.reduce((acc, link) => {
            acc[link.url.toLowerCase()] = link;
            return acc;
        }, {});
        return Object.fromEntries(Object.entries(this.linkData).map(([url, link]) => [url, (link.numAccounts || 0) + (link.numToots || 0)]));
    }
    async _score(toot) {
        const links = Object.values(this.linkData).filter((link) => toot.content.toLowerCase().includes(link.url.toLowerCase()));
        return links.map(link => (link.numToots || 0) + (link.numAccounts || 0)).reduce((total, x) => total + x, 0);
    }
}
exports.default = TrendingLinksScorer;
;
function decorateTrendingLink(link) {
    const trendingLink = link;
    trendingLink.url = trendingLink.url.toLowerCase();
    if (!trendingLink?.history?.length) {
        console.warn(`decorateTrendingTag() found no history for tag:`, trendingLink);
        trendingLink.history = [];
    }
    const recentHistory = trendingLink.history.slice(0, Storage_1.default.getConfig().numDaysToCountTrendingTagData);
    trendingLink.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    trendingLink.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
    return trendingLink;
}
//# sourceMappingURL=trending_links_scorer.js.map