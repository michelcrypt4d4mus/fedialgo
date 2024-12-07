import { mastodon } from "masto";
import { Toot, TrendingTag } from "../types";
export declare const ACCESS_TOKEN_REVOKED_MSG = "The access token was revoked";
export declare const FILTER_ENDPOINT = "api/v2/filters";
export declare function searchForToots(api: mastodon.rest.Client, searchQuery: string, limit?: number | null): Promise<Toot[]>;
export declare const mastodonFetch: <T>(server: string, endpoint: string, limit?: number | null) => Promise<T | undefined>;
interface FetchParams<T> {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>);
    maxRecords?: number;
    label?: string;
    noParams?: boolean;
}
export declare function mastodonFetchPages<T>(fetchParams: FetchParams<T>): Promise<T[]>;
export declare function getMonthlyUsers(server: string): Promise<number>;
export declare function getUserRecentToots(api: mastodon.rest.Client, user: mastodon.v1.Account): Promise<Toot[]>;
export declare function getTootsForTag(api: mastodon.rest.Client, tag: TrendingTag): Promise<Toot[]>;
export {};
