import { mastodon } from "masto";
import { StorageValue } from "./types";
export declare enum Key {
    CORE_SERVER = "coreServer",
    FOLLOWED_TAGS = "FollowedTags",
    LAST_OPENED = "lastOpened",
    OPENINGS = "openings",
    RECENT_TOOTS = "recentToots",
    TOP_FAVS = "Favs",
    TOP_INTERACTS = "Interactions",
    TOP_REBLOGS = "MostRetootedAccounts",
    USER = "algouser",
    WEIGHTS = "weights"
}
export default class Storage {
    protected static get(key: Key, groupedByUser?: boolean, suffix?: string): Promise<StorageValue>;
    protected static set(key: Key, value: StorageValue, groupedByUser?: boolean, suffix?: string): Promise<void>;
    static suffix(key: Key, suffix: string): string;
    protected static remove(key: Key, groupedByUser?: boolean, suffix?: string): Promise<void>;
    protected static prefix(key: string): Promise<string>;
    static logAppOpen(): Promise<void>;
    static getLastOpenedTimestamp(): Promise<number>;
    static getNumAppOpens(): Promise<number>;
    static getIdentity(): Promise<mastodon.v1.Account>;
    static setIdentity(user: mastodon.v1.Account): Promise<void>;
}
