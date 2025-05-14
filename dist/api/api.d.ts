import { mastodon } from "masto";
import Account from "./objects/account";
import Toot from './objects/toot';
import UserData from "./user_data";
import { MastodonTag, StorageKey } from "../types";
import { ConfigType } from "../config";
export declare const INSTANCE = "instance";
export declare const LINKS = "links";
export declare const STATUSES = "statuses";
export declare const TAGS = "tags";
interface BackfillParams {
    maxRecords?: number;
    moar?: boolean;
}
interface MaxIdParams extends BackfillParams {
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
    getCacheableToots(key: StorageKey, fetch: () => Promise<mastodon.v1.Status[]>, maxRecordsConfigKey: keyof ConfigType): Promise<Toot[]>;
    getFollowedAccounts(params?: BackfillParams): Promise<Account[]>;
    getFollowedTags(params?: BackfillParams): Promise<mastodon.v1.Tag[]>;
    getMutedAccounts(params?: BackfillParams): Promise<Account[]>;
    getRecentFavourites(params?: BackfillParams): Promise<Toot[]>;
    getRecentNotifications(params?: MaxIdParams): Promise<mastodon.v1.Notification[]>;
    getRecentUserToots(params?: MaxIdParams): Promise<Toot[]>;
    getServerSideFilters(): Promise<mastodon.v2.Filter[]>;
    getStatusesForTag(tag: MastodonTag, numToots?: number): Promise<mastodon.v1.Status[]>;
    getStatusesForTags(tags: MastodonTag[], numTootsPerTag?: number): Promise<mastodon.v1.Status[]>;
    getUserData(): Promise<UserData>;
    resolveToot(toot: Toot): Promise<Toot>;
    searchForToots(searchStr: string, maxRecords?: number): Promise<mastodon.v1.Status[]>;
    setSemaphoreConcurrency(concurrency: number): void;
    private getApiRecords;
    private hashtagTimelineToots;
    private buildParams;
    private buildFromApiObjects;
    static throwIfAccessTokenRevoked(e: unknown, msg: string): void;
}
export declare function isAccessTokenRevokedError(e: Error | unknown): boolean;
export {};
