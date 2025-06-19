import { mastodon } from "masto";
import type Toot from "./toot";
import { type MastodonTag, type TrendingWithHistory } from "../../types";
export declare function decorateLinkHistory(link: mastodon.v1.TrendLink): void;
export declare function decorateTagHistory(tag: MastodonTag): void;
export declare function uniquifyTrendingObjs<T extends TrendingWithHistory>(trendingObjs: T[], uniqueKey: (obj: T) => string): T[];
export declare function setTrendingRankToAvg(rankedToots: Toot[]): void;
