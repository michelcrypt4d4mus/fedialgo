import { mastodon } from "masto";
import { AccountNames, FeedFilterSettings, StringNumberDict, StorageValue, Toot } from "./types";
export declare enum Key {
    CORE_SERVER = "coreServer",
    FILTERS = "filters",
    FOLLOWED_ACCOUNTS = "FollowedAccounts",
    FOLLOWED_TAGS = "FollowedTags",
    LAST_OPENED = "lastOpened",
    OPENINGS = "openings",
    RECENT_TOOTS = "recentToots",
    REPLIED_TO = "MostRepliedAccounts",
    TIMELINE = "timeline",
    TOP_FAVS = "Favs",
    TOP_INTERACTS = "Interactions",
    TOP_REBLOGS = "MostRetootedAccounts",
    USER = "algouser",
    WEIGHTS = "weights"
}
export declare const DEFAULT_FILTERS: FeedFilterSettings;
export default class Storage {
    static getWeightings(): Promise<StringNumberDict>;
    static setWeightings(userWeightings: StringNumberDict): Promise<void>;
    static getFilters(): Promise<FeedFilterSettings>;
    static setFilters(filters: FeedFilterSettings): Promise<void>;
    static getFollowedAccts(): Promise<AccountNames | null>;
    static logAppOpen(): Promise<void>;
    static getLastOpenedTimestamp(): Promise<number>;
    static getNumAppOpens(): Promise<number>;
    static getIdentity(): Promise<mastodon.v1.Account | null>;
    static setIdentity(user: mastodon.v1.Account): Promise<void>;
    static getFeed(): Promise<Toot[]>;
    static setFeed(timeline: Toot[]): Promise<void>;
    static get(key: Key): Promise<StorageValue | null>;
    protected static set(key: Key, value: StorageValue): Promise<void>;
    protected static remove(key: Key): Promise<void>;
    private static buildKey;
}
