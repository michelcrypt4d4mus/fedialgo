import AsyncStorage from '@react-native-async-storage/async-storage';
import { mastodon } from "masto";

import { StorageValue } from "./types";

export enum Key {
    CORE_SERVER = 'coreServer',
    FOLLOWED_TAGS = 'FollowedTags',
    LAST_OPENED = "lastOpened",
    OPENINGS = "openings",
    RECENT_TOOTS = "recentToots",
    REPLIED_TO = "MostRepliedAccounts",
    TOP_FAVS = 'Favs',
    TOP_INTERACTS = 'Interactions',
    TOP_REBLOGS = 'MostRetootedAccounts',
    USER = 'algouser',
    WEIGHTS = 'weights',
};


export default class Storage {
    // TODO: currently groupedByUser is always true ?
    protected static async get(key: Key, groupedByUser: boolean = true, suffix: string = ""): Promise<StorageValue> {
        const suffixKey = this.suffix(key, suffix);
        const storageKey = groupedByUser ? await this.prefix(suffixKey) : suffixKey;
        const jsonValue = await AsyncStorage.getItem(storageKey);
        const value = jsonValue != null ? JSON.parse(jsonValue) : null;

        return value != null ? value[storageKey] : null;
    }

    protected static async set(key: Key, value: StorageValue, groupedByUser = true, suffix = "") {
        const suffixKey = this.suffix(key, suffix);
        const storageKey = groupedByUser ? await this.prefix(suffixKey) : suffixKey;
        const jsonValue = JSON.stringify({ [storageKey]: value })
        await AsyncStorage.setItem(storageKey, jsonValue);
    }

    static suffix(key: Key, suffix: string) {
        if (suffix === "") return key;
        return `${key}_${suffix}`;
    }

    protected static async remove(key: Key, groupedByUser = true, suffix = "") {
        const suffixKey = this.suffix(key, suffix);
        const storageKey = groupedByUser ? await Storage.prefix(suffixKey) : suffixKey;
        await AsyncStorage.removeItem(storageKey);
    }

    protected static async prefix(key: string) {
        const user = await this.getIdentity();
        return `${user.id}_${key}`;
    }

    static async logAppOpen() {
        const numAppOpens = parseInt(await this.get(Key.OPENINGS) as string);

        if (numAppOpens == null || isNaN(numAppOpens)) {
            await this.set(Key.OPENINGS, "1", true);
        } else {
            await this.set(Key.OPENINGS, (numAppOpens + 1).toString(), true);
        }

        await this.set(Key.LAST_OPENED, new Date().getTime().toString(), true);
    }

    static async getLastOpenedTimestamp() {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = parseInt(await this.get(Key.LAST_OPENED) as string);
        console.log(`lastOpenedTimestamp (after ${numAppOpens} app opens) milliseconds: ${lastOpenedInt}`);

        if (numAppOpens <= 1) {
            console.log(`Only 1 numAppOpens so returning 0 for getLastOpenedTimestamp()`);
            return 0;
        }

        if (lastOpenedInt) {
            console.log(`lastOpenedTimestamp: ${new Date(lastOpenedInt)}`);
        } else {
            console.log("lastOpenedTimestamp not found");
        }

        return lastOpenedInt;
    }

    static async getNumAppOpens() {
        const numAppOpens = parseInt(await this.get(Key.OPENINGS) as string);
        console.debug(`getNumAppOpens() returning ${numAppOpens}`);
        return numAppOpens;
    }

    static async getIdentity(): Promise<mastodon.v1.Account> {
        const userJson = await AsyncStorage.getItem(Key.USER);
        const user: mastodon.v1.Account = userJson != null ? JSON.parse(userJson) : null;
        return user;
    }

    static async setIdentity(user: mastodon.v1.Account) {
        const userJson = JSON.stringify(user);
        await AsyncStorage.setItem(Key.USER, userJson);
    }
};
