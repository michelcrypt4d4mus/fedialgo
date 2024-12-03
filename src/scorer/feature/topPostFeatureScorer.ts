/*
 * Just pulls the trendingRank, which is set by getTrendingToots(), from the toot and uses
 * that as the score.
 */
import FeatureScorer from '../FeatureScorer';
import { average } from '../../helpers';
import { Toot } from "../../types";

export const TRENDING_TOOTS = "TrendingToots";
export const TRENDING_TOOTS_DEFAULT_WEIGHT = 0.08;


// TODO: rename TrendingTootFeatureScorer
export default class TopPostFeatureScorer extends FeatureScorer {
    constructor() {
        super({
            description: "Favour toots that are trending across the Fediverse",
            defaultWeight: TRENDING_TOOTS_DEFAULT_WEIGHT,
            scoreName: TRENDING_TOOTS,
        });
    }

    async _score(toot: Toot) {
        return toot.trendingRank || 0;
    }

    // A toot can trend on multiple servers, in which case we want to compute the
    // average trendingRank and update the toots accordingly.
    // TODO: maybe we should add all the trendingRanks together? Or maybe add the # of servers to the avg?
    static setTrendingRankToAvg(rankedToots: Toot[]): void {
        const multiToots = rankedToots.reduce(
            (acc, toot) => {
                if (!toot.trendingRank) return acc;
                acc[toot.uri] ||= [];
                acc[toot.uri].push(toot);
                return acc;
            },
            {} as Record<string, Toot[]>
        );

        Object.entries(multiToots).forEach(([uri, toots]) => {
            if (toots.length <= 1) return;

            const trendingRanks = toots.map(t => t.trendingRank) as number[];
            const avgScore = average(trendingRanks);
            const msg = `Found ${toots.length} of ${uri} (trendingRanks: ${trendingRanks}, avg: ${avgScore}).`;
            console.debug(`${msg} First toot:`, toots[0]);
            toots.forEach(toot => toot.trendingRank = avgScore);
        });
    }
};
