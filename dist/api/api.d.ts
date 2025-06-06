import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from './objects/toot';
import UserData from "./user_data";
import { CacheKey } from "../enums";
import { WaitTime } from '../helpers/log_helpers';
import { Logger } from '../helpers/logger';
import { type ApiCacheKey, type ConcurrencyLockRelease, type MastodonTag, type TootLike } from "../types";
interface ApiParams {
    logger?: Logger;
    maxRecords?: number;
    moar?: boolean;
    skipCache?: boolean;
}
interface MaxIdParams extends ApiParams {
    maxId?: string | number | null;
}
interface HomeTimelineParams extends MaxIdParams {
    mergeTootsToFeed: (toots: Toot[], logger: Logger) => Promise<void>;
}
export default class MastoApi {
    #private;
    api: mastodon.rest.Client;
    apiErrors: Error[];
    homeDomain: string;
    logger: Logger;
    user: Account;
    userData?: UserData;
    waitTimes: {
        [key in CacheKey]?: WaitTime;
    };
    private mutexes;
    private requestSemphore;
    static init(api: mastodon.rest.Client, user: Account): void;
    static get instance(): MastoApi;
    private constructor();
    fetchHomeFeed(params: HomeTimelineParams): Promise<Toot[]>;
    getBlockedAccounts(): Promise<Account[]>;
    getCacheableToots(fetchStatuses: () => Promise<TootLike[]>, cacheKey: ApiCacheKey, maxRecords: number): Promise<Toot[]>;
    getFavouritedToots(params?: ApiParams): Promise<Toot[]>;
    getFollowedAccounts(params?: ApiParams): Promise<Account[]>;
    getFollowedTags(params?: ApiParams): Promise<mastodon.v1.Tag[]>;
    getMutedAccounts(params?: ApiParams): Promise<Account[]>;
    getNotifications(params?: MaxIdParams): Promise<mastodon.v1.Notification[]>;
    getRecentUserToots(params?: MaxIdParams): Promise<Toot[]>;
    getServerSideFilters(): Promise<mastodon.v2.Filter[]>;
    getStatusesForTag(tagName: string, logger: Logger, numToots?: number): Promise<TootLike[]>;
    getUserData(): Promise<UserData>;
    hashtagTimelineToots(tagName: string, logger: Logger, maxRecords?: number): Promise<Toot[]>;
    instanceInfo(): Promise<mastodon.v2.Instance>;
    lockAllMutexes(): Promise<ConcurrencyLockRelease[]>;
    resolveToot(toot: Toot): Promise<Toot>;
    searchForToots(searchStr: string, logger: Logger, maxRecords?: number): Promise<mastodon.v1.Status[]>;
    reset(): void;
    setSemaphoreConcurrency(concurrency: number): void;
    tagUrl(tag: MastodonTag | string): string;
    private endpointURL;
    private supportsMinMaxId;
    private getApiRecords;
    private buildParams;
    private addCacheDataToParams;
    private getCachedRows;
    private handleApiError;
    private buildFromApiObjects;
    private shouldReturnCachedRows;
    private validateFetchParams;
    static throwIfAccessTokenRevoked(logger: Logger, error: unknown, msg: string): void;
    static throwSanitizedRateLimitError(error: unknown, msg: string): void;
}
export declare function isAccessTokenRevokedError(e: Error | unknown): boolean;
export declare function isRateLimitError(e: Error | unknown): boolean;
export {};
