"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Key = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
var Key;
(function (Key) {
    Key["CORE_SERVER"] = "coreServer";
    Key["LAST_OPENED"] = "lastOpened";
    Key["OPENINGS"] = "openings";
    Key["TOP_FAVS"] = "favs";
    Key["TOP_INTERACTS"] = "interacts";
    Key["TOP_REBLOGS"] = "reblogs";
    Key["USER"] = "algouser";
    Key["WEIGHTS"] = "weights";
})(Key || (exports.Key = Key = {}));
;
class Storage {
    static async get(key, groupedByUser = true, suffix = "") {
        const suffixKey = this.suffix(key, suffix);
        const storageKey = groupedByUser ? await this.prefix(suffixKey) : suffixKey;
        const jsonValue = await async_storage_1.default.getItem(storageKey);
        const value = jsonValue != null ? JSON.parse(jsonValue) : null;
        return value != null ? value[storageKey] : null;
    }
    static async set(key, value, groupedByUser = true, suffix = "") {
        const suffixKey = this.suffix(key, suffix);
        const storageKey = groupedByUser ? await this.prefix(suffixKey) : suffixKey;
        const jsonValue = JSON.stringify({ [storageKey]: value });
        await async_storage_1.default.setItem(storageKey, jsonValue);
    }
    static suffix(key, suffix) {
        if (suffix === "")
            return key;
        return `${key}_${suffix}`;
    }
    static async remove(key, groupedByUser = true, suffix = "") {
        const suffixKey = this.suffix(key, suffix);
        const storageKey = groupedByUser ? await Storage.prefix(suffixKey) : suffixKey;
        await async_storage_1.default.removeItem(storageKey);
    }
    static async prefix(key) {
        const user = await this.getIdentity();
        return `${user.id}_${key}`;
    }
    static async logAppOpen() {
        const numAppOpens = parseInt(await this.get(Key.OPENINGS, true));
        if (numAppOpens == null || isNaN(numAppOpens)) {
            await this.set(Key.OPENINGS, "1", true);
        }
        else {
            await this.set(Key.OPENINGS, (numAppOpens + 1).toString(), true);
        }
        await this.set(Key.LAST_OPENED, new Date().getTime().toString(), true);
    }
    static async getLastOpenedTimestamp() {
        const numAppOpens = (await this.getNumAppOpens()) ?? 0;
        const lastOpenedInt = parseInt(await this.get(Key.LAST_OPENED, true));
        console.log(`lastOpenedTimestamp (after ${numAppOpens} app opens) milliseconds: ${lastOpenedInt}`);
        if (numAppOpens <= 1) {
            console.log(`Only 1 numAppOpens so returning 0 for getLastOpenedTimestamp()`);
            return 0;
        }
        if (lastOpenedInt) {
            console.log(`lastOpenedTimestamp: ${new Date(lastOpenedInt)}`);
        }
        else {
            console.log("lastOpenedTimestamp not found");
        }
        return lastOpenedInt;
    }
    static async getNumAppOpens() {
        const numAppOpens = parseInt(await this.get(Key.OPENINGS, true));
        console.debug(`getNumAppOpens() returning ${numAppOpens}`);
        return numAppOpens;
    }
    static async getIdentity() {
        const userJson = await async_storage_1.default.getItem(Key.USER);
        const user = userJson != null ? JSON.parse(userJson) : null;
        return user;
    }
    static async setIdentity(user) {
        const userJson = JSON.stringify(user);
        await async_storage_1.default.setItem(Key.USER, userJson);
    }
}
exports.default = Storage;
;
//# sourceMappingURL=Storage.js.map