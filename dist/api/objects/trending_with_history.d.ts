import { mastodon } from "masto";
import Toot from "./toot";
import { TrendingWithHistory } from "../../types";
export declare function decorateHistoryScores(_obj: mastodon.v1.TrendLink | mastodon.v1.Tag): void;
export declare function uniquifyTrendingObjs<T>(trendingObjs: TrendingWithHistory[], uniqueKey: (obj: TrendingWithHistory) => string): T[];
export declare function setTrendingRankToAvg(rankedToots: Toot[]): void;
