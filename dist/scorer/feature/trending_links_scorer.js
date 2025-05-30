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
const collection_helpers_1 = require("../../helpers/collection_helpers");
class TrendingLinksScorer extends feature_scorer_1.default {
    description = "Favour links that are trending in the Fediverse";
    constructor() {
        super(types_1.ScoreName.TRENDING_LINKS);
    }
    // TODO: this is unnecessary as numAccounts should be stored in the TrendingLink objects
    async prepareScoreData() {
        return (await mastodon_server_1.default.fediverseTrendingLinks()).reduce((accountsPostingLinkCounts, link) => {
            accountsPostingLinkCounts[link.url] = link.numAccounts || 0;
            return accountsPostingLinkCounts;
        }, {});
    }
    async _score(toot) {
        toot = toot.reblog || toot;
        if (!toot.trendingLinks) {
            this.logger.warn(`No trendingLinks found for toot:`, toot);
            return 0;
        }
        return (0, collection_helpers_1.sumArray)(toot.trendingLinks.map(link => this.scoreData[link.url] || 0));
    }
}
exports.default = TrendingLinksScorer;
;
//# sourceMappingURL=trending_links_scorer.js.map