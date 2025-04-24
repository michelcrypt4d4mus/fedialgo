"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../../helpers");
const helpers_2 = require("../../helpers");
const api_1 = require("../api");
;
class Account {
    id;
    username;
    acct;
    bot; // isBot
    createdAt;
    discoverable;
    displayName;
    followersCount;
    followingCount;
    group;
    lastStatusAt;
    locked;
    note; // Profile bio, in plain-text instead of in HTML.
    statusesCount;
    url;
    // Arrays
    emojis;
    fields;
    // Images
    avatar;
    avatarStatic;
    header;
    headerStatic;
    // Optional
    noindex; // Don't index this account in search engines
    moved;
    suspended;
    limited;
    roles;
    constructor(account) {
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
    describe() {
        return `${this.displayName} (${this.webfingerURI()})`;
    }
    displayNameWithEmojis() {
        return (0, helpers_1.replaceEmojiShortcodesWithImageTags)(this.displayName, this.emojis || []);
    }
    // 'https://journa.host/@dell' -> 'journa.host'
    homeserver() {
        return (0, helpers_2.extractDomain)(this.url) || "unknown.server";
    }
    homserverURL() {
        if (this.homeserver() == api_1.MastoApi.instance.homeDomain) {
            return this.url;
        }
        else {
            return `https://${api_1.MastoApi.instance.homeDomain}/@${this.webfingerURI()}`;
        }
    }
    // Strip functions so it can be serialized to local storage
    serialize() {
        return { ...this };
    }
    // On the local server you just get the username, but on other servers you need to add the server name
    // Inject the @server info to accounts on the user's home server
    // TODO: should this add a preceding '@'? e.g. should 'abc@c.im' be '@abc@c.im' (as it appears in URLs)??
    // TODO: home server needs to be removed from URL or links break!
    webfingerURI() {
        if (this.acct.includes("@")) {
            return this.acct;
        }
        else {
            return `${this.acct}@${this.homeserver()}`;
        }
    }
    // Build a dictionary from the Account.webfingerURI() to the Account object for easy lookup
    static buildAccountNames(accounts) {
        return accounts.reduce((accountsDict, account) => {
            accountsDict[account.webfingerURI()] = account;
            return accountsDict;
        }, {});
    }
}
exports.default = Account;
;
//# sourceMappingURL=account.js.map