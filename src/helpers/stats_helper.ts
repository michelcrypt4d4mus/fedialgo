/*
 * Help prepping data for recharts and other algorithm statistics stuff.
 */
import Scorer from "../scorer/scorer";
import Toot from "../api/objects/toot";
import { suffixedInt } from "./string_helpers";


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

    Object.entries(Scorer.computeScoreStats(toots, numPercentiles)).forEach(([scoreName, scoreStats]) => {
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

    console.log(`[rechartsDataPoints()]`, stats);
    return stats;
}
