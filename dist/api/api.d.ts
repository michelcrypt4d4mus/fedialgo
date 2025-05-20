import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from './objects/toot';
import UserData from "./user_data";
import { MastodonTag, StorageKey } from "../types";
export declare const INSTANCE = "instance";
export declare const LINKS = "links";
export declare const STATUSES = "statuses";
export declare const TAGS = "tags";
interface ApiParams {
    maxRecords?: number;
    moar?: boolean;
    skipCache?: boolean;
}
interface MaxIdParams extends ApiParams {
    maxId?: string | number;
}
interface HomeTimelineParams extends MaxIdParams {
    mergeTootsToFeed: (toots: Toot[], logPrefix: string) => Promise<void>;
}
export default class MastoApi {
    #private;
    api: mastodon.rest.Client;
    homeDomain: string;
    user: Account;
    userData?: UserData;
    private mutexes;
    private requestSemphore;
    tagUrl: (tag: MastodonTag | string) => string;
    endpointURL: (endpoint: string) => string;
    static init(api: mastodon.rest.Client, user: Account): void;
    static get instance(): MastoApi;
    private constructor();
    fetchHomeFeed(params: HomeTimelineParams): Promise<Toot[]>;
    getBlockedAccounts(): Promise<Account[]>;
    getCacheableToots(fetch: () => Promise<mastodon.v1.Status[]>, key: StorageKey, maxRecords: number): Promise<Toot[]>;
    getFavouritedToots(params?: ApiParams): Promise<Toot[]>;
    getFollowedAccounts(params?: ApiParams): Promise<Account[]>;
    getFollowedTags(params?: ApiParams): Promise<mastodon.v1.Tag[]>;
    getMutedAccounts(params?: ApiParams): Promise<Account[]>;
    getNotifications(params?: MaxIdParams): Promise<mastodon.v1.Notification[]>;
    getRecentUserToots(params?: MaxIdParams): Promise<Toot[]>;
    getServerSideFilters(): Promise<mastodon.v2.Filter[]>;
    getStatusesForTag(tag: MastodonTag, numToots?: number): Promise<mastodon.v1.Status[]>;
    getStatusesForTags(tags: MastodonTag[], numTootsPerTag?: number): Promise<mastodon.v1.Status[]>;
    getUserData(): Promise<UserData>;
    hashtagTimelineToots(tag: MastodonTag, maxRecords?: number): Promise<Toot[]>;
    resolveToot(toot: Toot): Promise<Toot>;
    searchForToots(searchStr: string, maxRecords?: number): Promise<mastodon.v1.Status[]>;
    setSemaphoreConcurrency(concurrency: number): void;
    private getApiRecords;
    private buildParams;
    private buildFromApiObjects;
    static throwIfAccessTokenRevoked(error: unknown, msg: string): void;
    static throwSanitizedRateLimitError(error: unknown, msg: string): void;
}
export declare function isAccessTokenRevokedError(e: Error | unknown): boolean;
export declare function isRateLimitError(e: Error | unknown): boolean;
export {};
