"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRENDING_TOOTS_DEFAULT_WEIGHT = exports.TRENDING_TOOTS = void 0;
/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
const FeatureScorer_1 = __importDefault(require("../FeatureScorer"));
const helpers_1 = require("../../helpers");
exports.TRENDING_TOOTS = "TrendingToots";
exports.TRENDING_TOOTS_DEFAULT_WEIGHT = 0.08;
// TODO: rename TrendingTootFeatureScorer
class TopPostFeatureScorer extends FeatureScorer_1.default {
    constructor() {
        super({
            description: "Favour toots that are trending across the Fediverse",
            defaultWeight: exports.TRENDING_TOOTS_DEFAULT_WEIGHT,
            scoreName: exports.TRENDING_TOOTS,
        });
    }
    async _score(toot) {
        return toot.trendingRank || 0;
    }
    // A toot can trend on multiple servers, in which case we want to compute the
    // average trendingRank and update the toots accordingly.
    // TODO: maybe we should add all the trendingRanks together? Or maybe add the # of servers to the avg?
    static setTrendingRankToAvg(rankedToots) {
        const multiToots = rankedToots.reduce((acc, toot) => {
            if (!toot.trendingRank)
                return acc;
            acc[toot.uri] ||= [];
            acc[toot.uri].push(toot);
            return acc;
        }, {});
        Object.entries(multiToots).forEach(([uri, toots]) => {
            if (toots.length <= 1)
                return;
            const trendingRanks = toots.map(t => t.trendingRank);
            const avgScore = (0, helpers_1.average)(trendingRanks);
            const msg = `Found ${toots.length} of ${uri} (trendingRanks: ${trendingRanks}, avg: ${avgScore}).`;
            console.debug(`${msg} First toot:`, toots[0]);
            toots.forEach(toot => toot.trendingRank = avgScore);
        });
    }
}
exports.default = TopPostFeatureScorer;
;
//# sourceMappingURL=topPostFeatureScorer.js.map