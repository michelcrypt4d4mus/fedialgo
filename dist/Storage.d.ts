import { mastodon } from "masto";
import { StorageValue } from "./types";
export declare enum Key {
    CORE_SERVER = "coreServer",
    LAST_OPENED = "lastOpened",
    OPENINGS = "openings",
    TOP_FAVS = "favs",
    TOP_INTERACTS = "interacts",
    TOP_REBLOGS = "reblogs",
    USER = "algouser",
    WEIGHTS = "weights"
}
export default class Storage {
    protected static get(key: Key, groupedByUser?: boolean, suffix?: string): Promise<StorageValue>;
    protected static set(key: Key, value: StorageValue, groupedByUser?: boolean, suffix?: string): Promise<void>;
    static suffix(key: Key, suffix: string): string;
    protected static remove(key: Key, groupedByUser?: boolean, suffix?: string): Promise<void>;
    protected static prefix(key: string): Promise<string>;
    static logOpening(): Promise<void>;
    static getLastOpened(): Promise<number>;
    static getOpenings(): Promise<number>;
    static getIdentity(): Promise<mastodon.v1.Account>;
    static setIdentity(user: mastodon.v1.Account): Promise<void>;
}
