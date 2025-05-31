import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from './objects/toot';
import UserData from "./user_data";
import { CacheKey } from "../enums";
import { ComponentLogger } from "../helpers/log_helpers";
import { WaitTime, type ConcurrencyLockRelease } from '../helpers/log_helpers';
import { type MastodonTag } from "../types";
interface ApiParams {
    logger?: ComponentLogger;
    maxRecords?: number;
    moar?: boolean;
    skipCache?: boolean;
}
interface MaxIdParams extends ApiParams {
    maxId?: string | number | null;
}
interface HomeTimelineParams extends MaxIdParams {
    mergeTootsToFeed: (toots: Toot[], logPrefix: string) => Promise<void>;
}
export default class MastoApi {
    #private;
    api: mastodon.rest.Client;
    homeDomain: string;
    logger: ComponentLogger;
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
    getCacheableToots(fetch: () => Promise<mastodon.v1.Status[]>, key: CacheKey, maxRecords: number): Promise<Toot[]>;
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
    instanceInfo(): Promise<mastodon.v2.Instance>;
    lockAllMutexes(): Promise<ConcurrencyLockRelease[]>;
    resolveToot(toot: Toot): Promise<Toot>;
    searchForToots(searchStr: string, maxRecords?: number): Promise<mastodon.v1.Status[]>;
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
    private validateFetchParams;
    static throwIfAccessTokenRevoked(error: unknown, msg: string): void;
    static throwSanitizedRateLimitError(error: unknown, msg: string): void;
}
export declare function isAccessTokenRevokedError(e: Error | unknown): boolean;
export declare function isRateLimitError(e: Error | unknown): boolean;
export {};
