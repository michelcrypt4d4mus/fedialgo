import { mastodon } from "masto";
import Toot from './objects/toot';
import { TimelineData, UserData } from "../types";
export declare class MastoApi {
    #private;
    api: mastodon.rest.Client;
    user: mastodon.v1.Account;
    static init(api: mastodon.rest.Client, user: mastodon.v1.Account): void;
    static get instance(): MastoApi;
    private constructor();
    getStartupData(): Promise<UserData>;
    getUserRecentToots(): Promise<Toot[]>;
    fetchFollowedAccounts(): Promise<mastodon.v1.Account[]>;
    getTimelineToots(numTimelineToots?: number, maxId?: string): Promise<TimelineData>;
    searchForToots(searchQuery: string, limit?: number): Promise<Toot[]>;
    getServerSideFilters(): Promise<mastodon.v2.Filter[]>;
    static v1Url: (path: string) => string;
    static v2Url: (path: string) => string;
    static trendUrl: (path: string) => string;
}
interface FetchParams<T> {
    fetch: ((params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>);
    maxRecords?: number;
    label?: string;
    noParams?: boolean;
}
export declare function mastodonFetchPages<T>(fetchParams: FetchParams<T>): Promise<T[]>;
export declare function throwIfAccessTokenRevoked(e: unknown, msg: string): void;
export {};
