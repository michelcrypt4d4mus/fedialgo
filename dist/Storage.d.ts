import { mastodon } from "masto";
import { Config, FeedFilterSettings, StorageValue, StringNumberDict, Toot } from "./types";
import { WeightName } from "./config";
export declare enum Key {
    CORE_SERVER = "coreServer",
    FILTERS = "filters",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    LAST_OPENED = "lastOpened",
    OPENINGS = "openings",
    RECENT_TOOTS = "recentToots",
    TIMELINE = "timeline",
    USER = "algouser",
    WEIGHTS = "weights"
}
export default class Storage {
    static config: Config;
    static getConfig(): Config;
    static getWeightings(): Promise<StringNumberDict>;
    static setWeightings(userWeightings: StringNumberDict): Promise<void>;
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
    protected static get(key: Key | WeightName): Promise<StorageValue | null>;
    protected static set(key: Key | WeightName, value: StorageValue): Promise<void>;
    protected static remove(key: Key | WeightName): Promise<void>;
    private static buildKey;
}
