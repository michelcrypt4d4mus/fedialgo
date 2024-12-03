import { mastodon } from "masto";
import { FeedFilterSettings, ScoresType, StorageValue, Toot } from "./types";
export declare enum Key {
    CORE_SERVER = "coreServer",
    FILTERS = "filters",
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
    static getWeightings(): Promise<ScoresType>;
    static setWeightings(userWeightings: ScoresType): Promise<void>;
    static getFilters(): Promise<FeedFilterSettings>;
    static setFilters(filters: FeedFilterSettings): Promise<void>;
    static logAppOpen(): Promise<void>;
    static getLastOpenedTimestamp(): Promise<number>;
    static getNumAppOpens(): Promise<number>;
    static getIdentity(): Promise<mastodon.v1.Account | null>;
    static setIdentity(user: mastodon.v1.Account): Promise<void>;
    static getFeed(): Promise<Toot[]>;
    static setFeed(timeline: Toot[]): Promise<void>;
    protected static get(key: Key, groupedByUser?: boolean, suffix?: string): Promise<StorageValue | null>;
    protected static set(key: Key, value: StorageValue, groupedByUser?: boolean, suffix?: string): Promise<void>;
    protected static remove(key: Key, groupedByUser?: boolean, suffix?: string): Promise<void>;
    private static buildKey;
    private static userPrefix;
}
