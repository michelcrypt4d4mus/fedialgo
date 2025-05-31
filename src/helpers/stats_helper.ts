/*
 * Help prepping data for recharts and other algorithm statistics stuff.
 */
import Toot from "../api/objects/toot";
import { average, makePercentileChunks } from "./collection_helpers";
import { ScoreName } from '../enums';
import { suffixedInt } from "./string_helpers";
import { traceLog } from "./log_helpers";
import { type MinMaxAvgScore, type ScoresStats, type WeightedScore } from "../types";


// Return an array of objects suitable for use with Recharts
export function rechartsDataPoints(toots: Toot[], numPercentiles: number = 5): any[] {
    const stats: any[] = [];
    let suffix: string;

    switch (numPercentiles) {
        case 4: suffix = ' Quartile'; break;
        case 5: suffix = ' Quintile'; break;
        case 10: suffix = ' Decile'; break;
        case 100: suffix = ' Percentile'; break;
        default: suffix = ''; break;
    };

    Object.entries(computeScoreStats(toots, numPercentiles)).forEach(([scoreName, scoreStats]) => {
        // scoreType is "raw" or "weighted"
        Object.entries(scoreStats).forEach(([scoreType, percentiles]) => {
            percentiles.forEach((percentile, i) => {
                stats[i] ||= {segment: suffixedInt(i + 1) + suffix};
                const baseKey = `${scoreName}_${scoreType}`;

                Object.entries(percentile).forEach(([k, v]) => {
                    stats[i][`${baseKey}_${k}`] = v;
                });
            });
        });
    });

    traceLog(`[rechartsDataPoints()]`, stats);
    return stats;
};


// Compute stats about the scores of a list of toots
function computeScoreStats(toots: Toot[], numPercentiles: number): ScoresStats {
    return Object.values(ScoreName).reduce((stats, scoreName) => {
        stats[scoreName] = {
            raw: scoreStats(toots, "raw", scoreName, numPercentiles),
            weighted: scoreStats(toots, "weighted", scoreName, numPercentiles),
        };

        return stats;
    }, {} as ScoresStats);
}


// Compute the min, max, and average of a score for each percentile segment
function scoreStats(
    toots: Toot[],
    scoreType: keyof WeightedScore,
    scoreName: ScoreName,
    numPercentiles: number
): MinMaxAvgScore[] {
    const getScoreOfType = (t: Toot) => t.getIndividualScore(scoreType, scoreName);

    return makePercentileChunks(toots, getScoreOfType, numPercentiles).map((segment) => {
        const sectionScores = segment.map(getScoreOfType);

        return {
            average: average(sectionScores),
            averageFinalScore: average(segment.map((toot) => toot.getScore())),
            count: segment.length,
            min: sectionScores[0],
            max: sectionScores.slice(-1)[0],
        };
    });
}
