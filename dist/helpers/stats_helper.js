"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rechartsDataPoints = void 0;
const collection_helpers_1 = require("./collection_helpers");
const types_1 = require("../types");
const string_helpers_1 = require("./string_helpers");
const log_helpers_1 = require("./log_helpers");
// Return an array of objects suitable for use with Recharts
function rechartsDataPoints(toots, numPercentiles = 5) {
    const stats = [];
    let suffix;
    switch (numPercentiles) {
        case 4:
            suffix = ' Quartile';
            break;
        case 5:
            suffix = ' Quintile';
            break;
        case 10:
            suffix = ' Decile';
            break;
        case 100:
            suffix = ' Percentile';
            break;
        default:
            suffix = '';
            break;
    }
    ;
    Object.entries(computeScoreStats(toots, numPercentiles)).forEach(([scoreName, scoreStats]) => {
        // scoreType is "raw" or "weighted"
        Object.entries(scoreStats).forEach(([scoreType, percentiles]) => {
            percentiles.forEach((percentile, i) => {
                stats[i] ||= { segment: (0, string_helpers_1.suffixedInt)(i + 1) + suffix };
                const baseKey = `${scoreName}_${scoreType}`;
                Object.entries(percentile).forEach(([k, v]) => {
                    stats[i][`${baseKey}_${k}`] = v;
                });
            });
        });
    });
    (0, log_helpers_1.traceLog)(`[rechartsDataPoints()]`, stats);
    return stats;
}
exports.rechartsDataPoints = rechartsDataPoints;
;
// Compute stats about the scores of a list of toots
function computeScoreStats(toots, numPercentiles) {
    return Object.values(types_1.ScoreName).reduce((stats, scoreName) => {
        stats[scoreName] = {
            raw: scoreStats(toots, "raw", scoreName, numPercentiles),
            weighted: scoreStats(toots, "weighted", scoreName, numPercentiles),
        };
        return stats;
    }, {});
}
// Compute the min, max, and average of a score for each percentile segment
function scoreStats(toots, scoreType, scoreName, numPercentiles) {
    const getScoreOfType = (t) => t.getIndividualScore(scoreType, scoreName);
    return (0, collection_helpers_1.makePercentileChunks)(toots, getScoreOfType, numPercentiles).map((segment) => {
        const sectionScores = segment.map(getScoreOfType);
        return {
            average: (0, collection_helpers_1.average)(sectionScores),
            averageFinalScore: (0, collection_helpers_1.average)(segment.map((toot) => toot.getScore())),
            count: segment.length,
            min: sectionScores[0],
            max: sectionScores.slice(-1)[0],
        };
    });
}
//# sourceMappingURL=stats_helper.js.map