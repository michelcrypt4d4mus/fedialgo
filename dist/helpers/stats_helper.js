"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rechartsDataPoints = void 0;
/*
 * Help prepping data for recharts and other algorithm statistics stuff.
 */
const scorer_1 = __importDefault(require("../scorer/scorer"));
const string_helpers_1 = require("./string_helpers");
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
    Object.entries(scorer_1.default.computeScoreStats(toots, numPercentiles)).forEach(([scoreName, scoreStats]) => {
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
    console.log(`[rechartsDataPoints()]`, stats);
    return stats;
}
exports.rechartsDataPoints = rechartsDataPoints;
//# sourceMappingURL=stats_helper.js.map