/*
 * Helper methods for dealing with Mastodon's Account objects.
 */
import { mastodon } from "masto";
import { Type } from "class-transformer";

import MastoApi from "../api";
import { AccountNames, StringNumberDict } from "../../types";
import { countValues, keyByProperty } from "../../helpers/collection_helpers";
import { extractDomain, replaceEmojiShortcodesWithImageTags } from "../../helpers/string_helpers";

interface AccountObj extends mastodon.v1.Account {
    describe?: () => string;
    homeserver?: () => string;
    homserverURL?: () => string;
    serialize?: () => mastodon.v1.Account;
    webfingerURI: string;  // NOTE: This is lost when we serialze the Account object
};


export default class Account implements AccountObj {
    id!: string;
    username!: string;
    acct!: string;
    bot!: boolean;  // isBot
    createdAt!: string;
    discoverable!: boolean;
    displayName!: string;
    followersCount!: number;
    followingCount!: number;
    group!: boolean;
    lastStatusAt!: string;
    locked!: boolean;
    note!: string;  // Profile bio, in plain-text instead of in HTML.
    statusesCount!: number;
    url!: string;
    // Arrays
    emojis!: mastodon.v1.CustomEmoji[];
    fields!: mastodon.v1.AccountField[];
    // Images
    avatar!: string;
    avatarStatic!: string;
    header!: string;
    headerStatic!: string;
    // Optional
    noindex?: boolean;  // Don't index this account in search engines
    @Type(() => Account) moved?: Account | null;
    suspended?: boolean | null;
    limited?: boolean | null;
    roles: Pick<mastodon.v1.Role, "id" | "name" | "color">[] = [];  // TODO: not sure default is a good idea
    // Fedialgo extension fields
    webfingerURI!: string;

    // Alternate constructor because class-transformer doesn't work with constructor arguments
    static build(account: mastodon.v1.Account): Account {
        const accountObj = new Account();
        accountObj.id = account.id;
        accountObj.username = account.username;
        accountObj.acct = account.acct;
        accountObj.displayName = account.displayName;
        accountObj.locked = account.locked;
        accountObj.bot = account.bot;
        accountObj.createdAt = account.createdAt;
        accountObj.group = account.group;
        accountObj.note = account.note;
        accountObj.url = account.url;
        accountObj.avatar = account.avatar;
        accountObj.avatarStatic = account.avatarStatic;
        accountObj.header = account.header;
        accountObj.headerStatic = account.headerStatic;
        accountObj.followersCount = account.followersCount;
        accountObj.followingCount = account.followingCount;
        accountObj.statusesCount = account.statusesCount;
        accountObj.lastStatusAt = account.lastStatusAt;
        // Arrays and optional fields
        accountObj.moved = account.moved ? Account.build(account.moved) : null;
        accountObj.emojis = account.emojis || [];
        accountObj.fields = account.fields || [];
        // boolean flags
        accountObj.discoverable = account.discoverable || false;
        accountObj.noindex = account.noindex || false;
        accountObj.limited = account.limited || false;
        accountObj.suspended = account.suspended || false;
        accountObj.roles = account.roles || [];
        // Fedialgo extension fields
        accountObj.webfingerURI = accountObj.buildWebfingerURI();
        return accountObj;
    }

    // e.g. "Foobar (@foobar@mastodon.social)"
    describe(): string {
        return `${this.displayName} (${this.webfingerURI})`;
    }

    // displayName prop but with the custom emojis replaced with <img> tags
    displayNameWithEmojis(): string {
        return replaceEmojiShortcodesWithImageTags(this.displayName, this.emojis || []);
    }

    // 'https://journa.host/@dell' -> 'journa.host'
    homeserver(): string {
        return extractDomain(this.url) || "unknown.server";
    }

    // Return the URL to the account on the fedialgo user's home server
    homserverURL(): string {
        if (this.homeserver() == MastoApi.instance.homeDomain) {
            return this.url;
        } else {
            return `https://${MastoApi.instance.homeDomain}/@${this.webfingerURI}`;
        }
    }

    // Strip functions so it can be serialized to local storage
    serialize(): mastodon.v1.Account {
        return {...this} as mastodon.v1.Account;
    }

    // On the local server you just get the username so need to add the server domain
    private buildWebfingerURI(): string {
        if (this.acct.includes("@")) {
            return this.acct;
        } else {
            return `${this.acct}@${this.homeserver()}`;
        }
    }

    ////////////////////////////
    //     Class Methods      //
    ////////////////////////////

    // Dictionary from account's webfingerURI to number of times it appears in 'accounts' argument
    // (Often it's just 1 time per webfingerURI and we are using this to make a quick lookup dictionary)
    public static buildWebfingerUriLookup(accounts: Account[]): StringNumberDict {
        return countValues<Account>(accounts, (account) => account.webfingerURI);
    }

    // Build a dictionary from the Account.webfingerURI to the Account object for easy lookup
    public static buildAccountNames(accounts: Account[]): AccountNames {
        return keyByProperty<Account>(accounts, acct => acct.webfingerURI);
    }
};
