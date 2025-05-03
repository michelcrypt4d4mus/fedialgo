/*
 * Helper methods for dealing with Mastodon's Account objects.
 */
import { mastodon } from "masto";

import MastoApi from "../api";
import { AccountNames } from "../../types";
import { extractDomain, replaceEmojiShortcodesWithImageTags } from "../../helpers/string_helpers";
import { keyByProperty } from "../../helpers/collection_helpers";

interface AccountObj extends mastodon.v1.Account {
    describe?: () => string;
    homeserver?: () => string;
    homserverURL?: () => string;
    serialize?: () => mastodon.v1.Account;
    webfingerURI: string;  // NOTE: This is lost when we serialze the Account object
};


export default class Account implements AccountObj {
    id: string;
    username: string;
    acct: string;
    bot: boolean;  // isBot
    createdAt: string;
    discoverable: boolean;
    displayName: string;
    followersCount: number;
    followingCount: number;
    group: boolean;
    lastStatusAt: string;
    locked: boolean;
    note: string;  // Profile bio, in plain-text instead of in HTML.
    statusesCount: number;
    url: string;
    // Arrays
    emojis: mastodon.v1.CustomEmoji[];
    fields: mastodon.v1.AccountField[];
    // Images
    avatar: string;
    avatarStatic: string;
    header: string;
    headerStatic: string;
    // Optional
    noindex?: boolean;  // Don't index this account in search engines
    moved?: mastodon.v1.Account | null | undefined;
    suspended?: boolean | null | undefined;
    limited?: boolean | null | undefined;
    roles: Pick<mastodon.v1.Role, "id" | "name" | "color">[];
    // Fedialgo extension fields
    webfingerURI: string;

    constructor(account: mastodon.v1.Account) {
        this.id = account.id;
        this.username = account.username;
        this.acct = account.acct;
        this.displayName = account.displayName;
        this.locked = account.locked;
        this.bot = account.bot;
        this.createdAt = account.createdAt;
        this.group = account.group;
        this.note = account.note;
        this.url = account.url;
        this.avatar = account.avatar;
        this.avatarStatic = account.avatarStatic;
        this.header = account.header;
        this.headerStatic = account.headerStatic;
        this.followersCount = account.followersCount;
        this.followingCount = account.followingCount;
        this.statusesCount = account.statusesCount;
        this.lastStatusAt = account.lastStatusAt;
        // Arrays and optional fields
        this.moved = account.moved ? new Account(account.moved) : null;
        this.emojis = account.emojis || [];
        this.fields = account.fields || [];
        // boolean flags
        this.discoverable = account.discoverable || false;
        this.noindex = account.noindex || false;
        this.limited = account.limited || false;
        this.suspended = account.suspended || false;
        this.roles = account.roles || [];
        // Fedialgo extension fields
        this.webfingerURI = this.buildWebfingerURI();
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

    // Build a dictionary from the Account.webfingerURI to the Account object for easy lookup
    public static buildAccountNames(accounts: Account[]): AccountNames {
        return keyByProperty<Account>(accounts, acct => acct.webfingerURI);
    }
};
