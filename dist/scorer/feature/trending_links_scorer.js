"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Score toots that contain currently trending links.
 * https://docs.joinmastodon.org/methods/trends/#links
 */
const feature_scorer_1 = __importDefault(require("../feature_scorer"));
const mastodon_server_1 = __importDefault(require("../../api/mastodon_server"));
const types_1 = require("../../types");
class TrendingLinksScorer extends feature_scorer_1.default {
    trendingLinks = [];
    constructor() {
        super(types_1.WeightName.TRENDING_LINKS);
    }
    async featureGetter() {
        this.trendingLinks = await mastodon_server_1.default.fediverseTrendingLinks();
        // TODO: could add numtoots? + (link.numToots || 0);
        return this.trendingLinks.reduce((accountsPostingLinkCounts, link) => {
            accountsPostingLinkCounts[link.url] = link.numAccounts || 0;
            return accountsPostingLinkCounts;
        }, {});
    }
    async _score(toot) {
        const links = this.trendingLinks.filter((link) => toot.content.toLowerCase().includes(link.url));
        return links.map(link => (link.numToots || 0) + (link.numAccounts || 0))
            .reduce((total, x) => total + x, 0);
    }
}
exports.default = TrendingLinksScorer;
;
//# sourceMappingURL=trending_links_scorer.js.map