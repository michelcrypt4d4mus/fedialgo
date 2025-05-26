import { mastodon } from "masto";
import Toot from "./toot";
import { MastodonTag, TagWithUsageCounts, TrendingLink, TrendingWithHistory } from "../../types";
export declare function decorateLinkHistory(link: mastodon.v1.TrendLink): TrendingLink;
export declare function decorateTagHistory(tag: MastodonTag): TagWithUsageCounts;
export declare function uniquifyTrendingObjs<T extends TrendingWithHistory>(trendingObjs: T[], uniqueKey: (obj: T) => string): T[];
export declare function setTrendingRankToAvg(rankedToots: Toot[]): void;
