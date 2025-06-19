"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mastodon_server_1 = __importDefault(require("../../api/mastodon_server"));
const toot_scorer_1 = __importDefault(require("../toot_scorer"));
const enums_1 = require("../../enums");
const collection_helpers_1 = require("../../helpers/collection_helpers");
/**
 * Score toots based on the numAccounts of any trending links they contain.
 * @memberof module:toot_scorers
 * @augments Scorer
 */
class TrendingLinksScorer extends toot_scorer_1.default {
    description = "Favour links that are trending in the Fediverse";
    constructor() {
        super(enums_1.ScoreName.TRENDING_LINKS);
    }
    // TODO: this is unnecessary as numAccounts should be stored in the TrendingLink objects
    async prepareScoreData() {
        return (await mastodon_server_1.default.fediverseTrendingLinks()).reduce((accountsPostingLinkCounts, link) => {
            accountsPostingLinkCounts[link.url] = link.numAccounts || 0;
            return accountsPostingLinkCounts;
        }, {});
    }
    async _score(toot) {
        if (!toot.realToot.trendingLinks) {
            this.logger.trace(`No trendingLinks found for toot: ${toot.description}`);
            return 0;
        }
        return (0, collection_helpers_1.sumArray)(toot.realToot.trendingLinks.map(link => this.scoreData[link.url]));
    }
}
exports.default = TrendingLinksScorer;
;
//# sourceMappingURL=trending_links_scorer.js.map