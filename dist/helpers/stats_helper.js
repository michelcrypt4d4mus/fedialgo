"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rechartsDataPoints = void 0;
/*
 * Help prepping data for recharts and other algorithm statistics stuff.
 */
const logger_1 = require("./logger");
const collection_helpers_1 = require("./collection_helpers");
const enums_1 = require("../enums");
const string_helpers_1 = require("./string_helpers");
const logger = new logger_1.Logger("stats_helper.ts");
// Compute stats about the scores of a list of toots
function computeScoreStats(toots, numPercentiles) {
    return Object.values(enums_1.ScoreName).reduce((stats, scoreName) => {
        stats[scoreName] = {
            raw: scoreStats(toots, "raw", scoreName, numPercentiles),
            weighted: scoreStats(toots, "weighted", scoreName, numPercentiles),
        };
        return stats;
    }, {});
}
;
// Return an array of objects suitable for use with Recharts
function rechartsDataPoints(toots, numPercentiles) {
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
    logger.trace(`[rechartsDataPoints()]`, stats);
    return stats;
}
exports.rechartsDataPoints = rechartsDataPoints;
;
// Compute the min, max, and average of a score for each percentile segment
function scoreStats(toots, scoreType, scoreName, numPercentiles) {
    const getScoreOfType = (t) => t.getIndividualScore(scoreType, scoreName);
    return (0, collection_helpers_1.makePercentileChunks)(toots, getScoreOfType, numPercentiles).map((segment) => {
        const sectionScores = segment.map(getScoreOfType);
        return {
            average: (0, collection_helpers_1.average)(sectionScores),
            averageFinalScore: (0, collection_helpers_1.average)(segment.map((toot) => toot.score)),
            count: segment.length,
            min: sectionScores[0],
            max: sectionScores.slice(-1)[0],
        };
    });
}
;
//# sourceMappingURL=stats_helper.js.map