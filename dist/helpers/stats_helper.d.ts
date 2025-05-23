import Toot from "../api/objects/toot";
import { ScoresStats } from "../types";
export declare function rechartsDataPoints(toots: Toot[], numPercentiles?: number): any[];
export declare function computeScoreStats(toots: Toot[], numPercentiles: number): ScoresStats;
