"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const string_helpers_1 = require("../../helpers/string_helpers");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const api_1 = __importDefault(require("../api"));
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
    // Fedialgo extension fields
    webfingerURI;
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
        // Fedialgo extension fields
        this.webfingerURI = this.buildWebfingerURI();
    }
    // e.g. "Foobar (@foobar@mastodon.social)"
    describe() {
        return `${this.displayName} (${this.webfingerURI})`;
    }
    displayNameWithEmojis() {
        return (0, string_helpers_1.replaceEmojiShortcodesWithImageTags)(this.displayName, this.emojis || []);
    }
    // 'https://journa.host/@dell' -> 'journa.host'
    homeserver() {
        return (0, string_helpers_1.extractDomain)(this.url) || "unknown.server";
    }
    homserverURL() {
        if (this.homeserver() == api_1.default.instance.homeDomain) {
            return this.url;
        }
        else {
            return `https://${api_1.default.instance.homeDomain}/@${this.webfingerURI}`;
        }
    }
    // Strip functions so it can be serialized to local storage
    serialize() {
        return { ...this };
    }
    // On the local server you just get the username, but on other servers you need to add the server name
    // Inject the @server info to accounts on the user's home server
    // TODO: should this add a preceding '@'? e.g. should 'abc@c.im' be '@abc@c.im' (as it appears in URLs)??
    // TODO: Would require adjusting MentionsFollowedScorer (StatusMention.acct is not preceded with an '@').
    buildWebfingerURI() {
        if (this.acct.includes("@")) {
            return this.acct;
        }
        else {
            return `${this.acct}@${this.homeserver()}`;
        }
    }
    // Build a dictionary from the Account.webfingerURI to the Account object for easy lookup
    static buildAccountNames(accounts) {
        return (0, collection_helpers_1.keyByProperty)(accounts, acct => acct.webfingerURI);
    }
}
exports.default = Account;
;
//# sourceMappingURL=account.js.map