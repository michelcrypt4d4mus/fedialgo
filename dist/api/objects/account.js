"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Helper methods for dealing with Mastodon's Account objects.
 */
const html_entities_1 = require("html-entities");
const class_transformer_1 = require("class-transformer");
const api_1 = __importDefault(require("../api"));
const mastodon_server_1 = __importDefault(require("../mastodon_server"));
const config_1 = require("../../config");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const logger_1 = require("../../helpers/logger");
const string_helpers_1 = require("../../helpers/string_helpers");
const NBSP_REGEX = /&nbsp;/g;
const ACCOUNT_JOINER = '  ●  ';
const ACCOUNT_CREATION_FMT = { year: "numeric", month: "short", day: "numeric" };
const logger = new logger_1.Logger("Account");
;
/**
 * Extends base Mastodon {@linkcode https://docs.joinmastodon.org/entities/Account/ Account} with
 * additional helper methods and properties. The base class's properties are not documented here;
 * @implements {AccountObj}
 * @extends {mastodon.v1.Account}
 * @property {BooleanFilterOption} asBooleanFilterOption - Boolean filter option representation.
 * @property {string} description - A string describing the account (displayName + webfingerURI).
 * @property {string} homeserver - The account's home server domain.
 * @property {boolean} [isFollowed] - True if this account is followed by the Fedialgo user.
 * @property {boolean} [isFollower] - True if this account is following the Fedialgo user.*
 * @property {boolean} isLocal - True if this account is on the same Mastodon server as the Fedialgo user.
 * @property {string} localServerUrl - The account's URL on the user's home server.
 * @property {string} webfingerURI - The webfinger URI for the account.
 */
class Account {
    // Identifying properties
    acct;
    id;
    username;
    // Other poperties
    createdAt;
    displayName;
    followersCount;
    followingCount;
    lastStatusAt;
    note; // Profile bio, in plain-text instead of in HTML.
    statusesCount;
    url;
    // Image URLs
    avatar;
    avatarStatic;
    header;
    headerStatic;
    // Boolean flags
    bot; // Would have been better to be named "isBot"
    discoverable;
    group;
    limited;
    locked;
    noindex; // Don't index this account in search engines
    suspended;
    // Arrays and optional fields
    emojis;
    fields;
    roles = []; // TODO: not sure default is a good idea
    // Optional fields
    moved;
    // Fedialgo extension fields
    isFollowed; // Is this account followed by the user?
    isFollower; // Is this account following the user?
    webfingerURI;
    // Returns this account's properties that can be used by the BooleanFilter class.
    get asBooleanFilterOption() {
        return {
            name: this.webfingerURI,
            displayName: this.displayName,
            displayNameWithEmoji: this.displayNameWithEmojis(),
            isFollowed: this.isFollowed,
        };
    }
    get description() { return `${this.displayName} (${this.webfingerURI})`; }
    ;
    get homeserver() { return (0, string_helpers_1.extractDomain)(this.url); }
    ;
    get isLocal() { return api_1.default.instance.isLocalUrl(this.url); }
    ;
    get localServerUrl() { return api_1.default.instance.accountUrl(this); }
    ;
    // Build the full webfinger URI for this account by appending the homeserver if necessary.
    get buildWebfingerURI() {
        return (this.acct.includes("@") ? this.acct : `${this.acct}@${this.homeserver}`).toLowerCase();
    }
    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {AccountLike} account - The Mastodon Account (or similar) to build from.
     * @returns {Account} Constructed Account instance with extra methods and properties.
     */
    static build(account) {
        if (account instanceof Account)
            return account; // Already an Account instance so return it
        const accountObj = new Account();
        // Identifying properties
        accountObj.acct = account.acct;
        accountObj.id = account.id;
        accountObj.username = account.username;
        // Other properties
        accountObj.createdAt = account.createdAt;
        accountObj.displayName = account.displayName;
        accountObj.followersCount = account.followersCount;
        accountObj.followingCount = account.followingCount;
        accountObj.group = account.group;
        accountObj.note = account.note;
        accountObj.statusesCount = account.statusesCount;
        accountObj.lastStatusAt = account.lastStatusAt;
        accountObj.url = account.url;
        // Image URLs
        accountObj.avatar = account.avatar;
        accountObj.avatarStatic = account.avatarStatic;
        accountObj.header = account.header;
        accountObj.headerStatic = account.headerStatic;
        // Boolean flags
        accountObj.bot = account.bot || false;
        accountObj.discoverable = account.discoverable || false;
        accountObj.limited = account.limited || false;
        accountObj.locked = account.locked || false;
        accountObj.noindex = account.noindex || false;
        accountObj.suspended = account.suspended || false;
        // Arrays and optional fields
        accountObj.emojis = account.emojis || [];
        accountObj.fields = account.fields || [];
        accountObj.roles = account.roles || [];
        // Optional fields
        accountObj.moved = account.moved ? Account.build(account.moved) : null;
        // Fedialgo extension fields
        accountObj.isFollowed = false; // Must be set later, in Toot.complete() or manually get getFollowedAccounts()
        accountObj.isFollower = false; // Must be set later, in Toot.complete() or manually get getFollowedAccounts()
        accountObj.webfingerURI = accountObj.buildWebfingerURI; // Memoized for future use
        return accountObj;
    }
    /**
     * Returns HTML-ish string combining the displayName (with custom emojis as &lt;img&gt; tags)
     * and the {@linkcode webfingerURI}.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji &lt;img&gt; tags. Should match surrounding txt.
     * @returns {string}
     */
    displayNameFullHTML(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        return this.displayNameWithEmojis(fontSize) + (0, html_entities_1.encode)(` (@${this.webfingerURI})`);
    }
    /**
     * Returns HTML-ish string that is the display name with custom emojis as &lt;img&gt; tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji &lt;img&gt; tags. Should match surrounding txt.
     * @returns {string}
     */
    displayNameWithEmojis(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        return (0, string_helpers_1.replaceEmojiShortcodesWithImgTags)(this.displayName, this.emojis || [], fontSize);
    }
    /**
     * Get this account's Mastodon server (AKA {@linkcode https://docs.joinmastodon.org/entities/Instance/ Instance})
     * from API. Note that not all servers provide this!
     * @returns {Promise<InstanceResponse>}
     */
    async homeInstanceInfo() {
        const server = new mastodon_server_1.default(this.homeserver);
        return await server.fetchServerInfo();
    }
    /**
     * HTML combining the account bio (AKA the {@linkcode Account.note} property) with {@linkcode createdAt},
     * follower count, and toots count.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size of returned HTML text (not just emoji &lt;img&gt; tags).
     * @returns {Promise<InstanceResponse>}
     */
    noteWithAccountInfo(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        const txt = this.note.replace(NBSP_REGEX, " "); // Remove non-breaking spaces so we can wrap the text
        const createdAt = new Date(this.createdAt);
        const accountStats = [
            `Created ${createdAt.toLocaleDateString(config_1.config.locale.locale, ACCOUNT_CREATION_FMT)}`,
            `${this.followersCount.toLocaleString()} Followers`,
            `${this.statusesCount.toLocaleString()} Toots`,
        ];
        const noteHTML = `${txt}<br /><p style="font-weight: bold; font-size: ${fontSize}px;">`;
        return noteHTML + `[${accountStats.join(ACCOUNT_JOINER)}]</p>`;
    }
    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////
    /**
     * Build a dictionary from Accounts' {@linkcode webfingerURI} to the {@linkcode Account} object for easy lookup.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {AccountNames} Dictionary from webfingerURI to Account.
     */
    static buildAccountNames(accounts) {
        return (0, collection_helpers_1.keyByProperty)(accounts, acct => acct.webfingerURI);
    }
    /**
     * Dictionary from account's {@linkcode webfingerURI} to number of times it appears in the
     * {@linkcode accounts} argument.
     * @param {Account[]} accounts - Array of {@linkcode Account} objects.
     * @returns {StringNumberDict} Dictionary from {@linkcode webfingerURI} to count of appearances.
     */
    static countAccounts(accounts) {
        return Object.values(this.countAccountsWithObj(accounts)).reduce((counts, accountWithCount) => {
            counts[accountWithCount.account.webfingerURI] = accountWithCount.count;
            return counts;
        }, {});
    }
    /**
     * Dictionary from account's {@linkcode webfingerURI} to an object with the account and count.
     * @param {Account[]} accounts - Array of {@linkcode Account} objects.
     * @returns {AccountCount} Dictionary from {@linkcode webfingerURI} to {account, count}.
     */
    static countAccountsWithObj(accounts) {
        return accounts.reduce((counts, account) => {
            counts[account.webfingerURI] ??= { account, count: 0 };
            counts[account.webfingerURI].count += 1;
            return counts;
        }, {});
    }
    /**
     * Logs all suspended accounts in the provided array.
     * @param {Account[]} accounts - Array of {@linkcode Account} objects.
     * @param {string} [logPrefix='logSuspendedAccounts()'] - Log prefix.
     */
    static logSuspendedAccounts(accounts, logPrefix) {
        accounts.filter(a => !!a.suspended).forEach(a => {
            logger.warn(`${(0, string_helpers_1.bracketed)(logPrefix)} Found suspended account:`, a);
        });
    }
}
exports.default = Account;
__decorate([
    (0, class_transformer_1.Type)(() => Account),
    __metadata("design:type", Object)
], Account.prototype, "moved", void 0);
;
//# sourceMappingURL=account.js.map