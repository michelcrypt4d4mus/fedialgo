import { mastodon } from "masto";
import { TrendingWithHistory } from "../../types";
export declare function decorateHistoryScores(_obj: mastodon.v1.TrendLink | mastodon.v1.Tag): void;
export declare function uniquifyTrendingObjs<T>(trendingObjs: TrendingWithHistory[], uniqueKey: (obj: TrendingWithHistory) => string): T[];
