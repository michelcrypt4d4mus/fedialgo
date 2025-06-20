import { mastodon } from "masto";
import type Toot from "./toot";
import { type Hashtag, type TagWithUsageCounts, type TrendingLink, type TrendingWithHistory } from "../../types";
export declare function decorateLinkHistory(link: mastodon.v1.TrendLink): TrendingLink;
export declare function decorateTagHistory(tag: Hashtag): TagWithUsageCounts;
export declare function uniquifyTrendingObjs<T extends TrendingWithHistory>(trendingObjs: T[], uniqueKey: (obj: T) => string): T[];
export declare function setTrendingRankToAvg(rankedToots: Toot[]): void;
