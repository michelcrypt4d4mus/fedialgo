/*
 * Helper methods for dealing with Mastodon's Account objects.
 */
import { mastodon } from "masto";

import { AccountNames } from "../../types";
import { extractDomain, replaceEmojiShortcodesWithImageTags } from "../../helpers/string_helpers";
import { MastoApi } from "../api";


interface AccountObj extends mastodon.v1.Account {
    describe?: () => string;
    homeserver?: () => string;
    webfingerURI?: () => string;
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
    }

    // e.g. "Foobar (@foobar@mastodon.social)"
    describe(): string {
        return `${this.displayName} (${this.webfingerURI()})`;
    }

    displayNameWithEmojis(): string {
        return replaceEmojiShortcodesWithImageTags(this.displayName, this.emojis || []);
    }

    // 'https://journa.host/@dell' -> 'journa.host'
    homeserver(): string {
        return extractDomain(this.url) || "unknown.server";
    }

    homserverURL(): string {
        if (this.homeserver() == MastoApi.instance.homeDomain) {
            return this.url;
        } else {
            return `https://${MastoApi.instance.homeDomain}/@${this.webfingerURI()}`;
        }
    }

    // Strip functions so it can be serialized to local storage
    serialize(): mastodon.v1.Account {
        return {...this} as mastodon.v1.Account;
    }

    // On the local server you just get the username, but on other servers you need to add the server name
    // Inject the @server info to accounts on the user's home server
    // TODO: should this add a preceding '@'? e.g. should 'abc@c.im' be '@abc@c.im' (as it appears in URLs)??
    // TODO: home server needs to be removed from URL or links break!
    webfingerURI(): string {
        if (this.acct.includes("@")) {
            return this.acct;
        } else {
            return `${this.acct}@${this.homeserver()}`;
        }
    }

    // Build a dictionary from the Account.webfingerURI() to the Account object for easy lookup
    public static buildAccountNames(accounts: Account[]): AccountNames {
        return accounts.reduce(
            (accountsDict, account) => {
                accountsDict[account.webfingerURI()] = account;
                return accountsDict;
            },
            {} as AccountNames
        );
    }
};
