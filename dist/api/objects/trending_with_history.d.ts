import { mastodon } from "masto";
import type Toot from "./toot";
import { type Hashtag, type TagWithUsageCounts, type TrendingLink, type TrendingWithHistory } from "../../types";
/**
 * Decorate a Mastodon {@linkcode https://docs.joinmastodon.org/entities/PreviewCard/#trends-link TrendLink}
 * with computed history data, adding {@linkcode numToots} & {@linkcode numAccounts} properties.
 * @param {mastodon.v1.TrendLink} link - The TrendLink object to decorate.
 * @returns {TrendingLink} The decorated TrendingLink object.
 */
export declare function decorateLinkHistory(link: mastodon.v1.TrendLink): TrendingLink;
/**
 * Decorate a mastodon {@linkcode https://docs.joinmastodon.org/entities/PreviewCard/#trends-link Tag} with
 * computed history data, adding {@linkcode numToots} & {@linkcode numAccounts} properties.
 * @param {Hashtag} tag - The Tag object to decorate.
 * @returns {TagWithUsageCounts} The decorated Tag object.
 */
export declare function decorateTagHistory(tag: Hashtag): TagWithUsageCounts;
/**
 * Return one of each unique trending object sorted by the number of accounts tooting that object.
 * The {@linkcode numToots} & {@linkcode numAccounts} props for each trending object are set to
 * the max value encountered.
 * @param {T[]} trendingObjs - Array of trending objects to uniquify.
 * @param {(obj: T) => string} uniqueKey - Function that returns the key to use for uniqueness.
 * @returns {T[]} Array of unique trending objects sorted by {@linkcode numAccounts}.
*/
export declare function uniquifyTrendingObjs<T extends TrendingWithHistory>(trendingObjs: T[], uniqueKey: (obj: T) => string): T[];
/**
 * A toot can trend on multiple servers in which case we set trendingRank for all to the avg
 * // TODO: maybe we should add the # of servers to the avg?
 * @param {Toot[]} rankedToots - Array of toots with trendingRank set.
 */
export declare function setTrendingRankToAvg(rankedToots: Toot[]): void;
