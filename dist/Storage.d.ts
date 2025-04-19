import { mastodon } from "masto";
import Toot from './api/objects/toot';
import { Config, FeedFilterSettings, StorageKey, StorableObj, TrendingLink, TrendingStorage, TrendingTag, Weights } from "./types";
export default class Storage {
    static config: Config;
    static getConfig(): Config;
    static getWeightings(): Promise<Weights>;
    static setWeightings(userWeightings: Weights): Promise<void>;
    static getFilters(): Promise<FeedFilterSettings>;
    static setFilters(filters: FeedFilterSettings): Promise<void>;
    static getFollowedAccts(): Promise<mastodon.v1.Account[]>;
    static logAppOpen(): Promise<void>;
    static getLastOpenedTimestamp(): Promise<number>;
    static getNumAppOpens(): Promise<number>;
    static getIdentity(): Promise<mastodon.v1.Account | null>;
    static setIdentity(user: mastodon.v1.Account): Promise<void>;
    static getFeed(): Promise<Toot[]>;
    static setFeed(timeline: Toot[]): Promise<void>;
    static setTrending(links: TrendingLink[], tags: TrendingTag[], _toots: Toot[]): Promise<void>;
    static getTrending(): Promise<TrendingStorage>;
    static get(key: StorageKey): Promise<StorableObj | null>;
    static set(key: StorageKey, value: StorableObj): Promise<void>;
    static remove(key: StorageKey): Promise<void>;
    private static buildKey;
}
