import { mastodon } from "masto";
import { Toot } from "../types";
export declare const DEFAULT_RECORDS_PER_PAGE = 40;
export declare function searchForToots(api: mastodon.rest.Client, searchQuery: string, limit?: number): Promise<Toot[]>;
export declare const mastodonFetch: <T>(server: string, endpoint: string) => Promise<T | undefined>;
interface FetchParams<T> {
    fetchMethod: (params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>;
    maxRecords?: number;
    label?: string;
}
export declare function mastodonFetchPages<T>(fetchParams: FetchParams<T>): Promise<T[]>;
export declare function getMonthlyUsers(server: string): Promise<number>;
export declare function getUserRecentToots(api: mastodon.rest.Client, user: mastodon.v1.Account): Promise<Toot[]>;
export {};