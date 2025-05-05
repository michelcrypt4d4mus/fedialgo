import { mastodon } from "masto";
import Toot from "./toot";
import { MastodonTag, TrendingWithHistory } from "../../types";
export declare function decorateHistoryScores(_obj: mastodon.v1.TrendLink | MastodonTag): void;
export declare function uniquifyTrendingObjs<T extends TrendingWithHistory>(trendingObjs: T[], uniqueKey: (obj: T) => string): T[];
export declare function setTrendingRankToAvg(rankedToots: Toot[]): void;
