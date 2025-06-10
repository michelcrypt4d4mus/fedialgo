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
const string_helpers_1 = require("../../helpers/string_helpers");
const collection_helpers_1 = require("../../helpers/collection_helpers");
const logger_1 = require("../../helpers/logger");
const NBSP_REGEX = /&nbsp;/g;
const ACCOUNT_JOINER = '  ●  ';
const ACCOUNT_CREATION_FMT = { year: "numeric", month: "short", day: "numeric" };
const logger = new logger_1.Logger("Account");
;
/**
 * Class representing a Mastodon Account with helper methods and additional properties.
 * Extends base Mastodon Account. The base class's properties are not documented here;
 * see https://docs.joinmastodon.org/entities/Account/ for details.
 * @implements {AccountObj}
 * @extends {mastodon.v1.Account}
 * @property {BooleanFilterOption} asBooleanFilterOption - Boolean filter option representation.
 * @property {string} description - A string describing the account (displayName + webfingerURI).
 * @property {string} homeserver - The account's home server domain.
 * @property {string} localServerUrl - The account's URL on the user's home server.
 * @property {boolean} [isFollowed] - Whether this account is followed by the user.
 * @property {boolean} [isFollower] - Whether this account is following the user.
 * @property {string} noteWithAccountInfo - HTML with note, creation date, followers, and toots count.
 * @property {string} webfingerURI - The webfinger URI for the account.
 */
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
    roles = []; // TODO: not sure default is a good idea
    // Fedialgo extension fields
    isFollowed; // Is this account followed by the user?
    isFollower; // Is this account following the user?
    webfingerURI;
    /**
     * Returns the account properties used in BooleanFilter.
     * @returns {BooleanFilterOption}
     */
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
    get homeserver() { return (0, string_helpers_1.extractDomain)(this.url) || "unknown.server"; }
    ;
    get localServerUrl() { return api_1.default.instance.accountUrl(this); }
    ;
    // Returns HTML combining the note property with creation date, followers, and toots count
    get noteWithAccountInfo() {
        let txt = this.note.replace(NBSP_REGEX, " "); // Remove non-breaking spaces so we can wrap the text
        const createdAt = new Date(this.createdAt);
        const accountStats = [
            `Created ${createdAt.toLocaleDateString(config_1.config.locale.locale, ACCOUNT_CREATION_FMT)}`,
            `${this.followersCount.toLocaleString()} Followers`,
            `${this.statusesCount.toLocaleString()} Toots`,
        ];
        return `${txt}<br /><p style="font-weight: bold; font-size: 13px;">[${accountStats.join(ACCOUNT_JOINER)}]</p>`;
    }
    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {AccountLike} account - The account data to build from.
     * @returns {Account} The constructed Account instance.
     */
    static build(account) {
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
        accountObj.limited = account.limited || false;
        accountObj.noindex = account.noindex || false;
        accountObj.suspended = account.suspended || false;
        accountObj.roles = account.roles || [];
        // Fedialgo extension fields
        accountObj.isFollowed = false; // Must be set later, in Toot.complete() or manually get getFollowedAccounts()
        accountObj.isFollower = false; // Must be set later, in Toot.complete() or manually get getFollowedAccounts()
        accountObj.webfingerURI = accountObj.buildWebfingerURI();
        return accountObj;
    }
    /**
     * Returns the display name with emojis and webfinger URI in HTML.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    displayNameFullHTML(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        return this.displayNameWithEmojis(fontSize) + (0, html_entities_1.encode)(` (@${this.webfingerURI})`);
    }
    /**
     * Returns HTML-ish string that is the display name with custom emojis as <img> tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    displayNameWithEmojis(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        return (0, string_helpers_1.replaceEmojiShortcodesWithImgTags)(this.displayName, this.emojis || [], fontSize);
    }
    /**
     * Gets the account's instance info from the API (note some servers don't provide this).
     * @returns {Promise<InstanceResponse>}
     */
    async homeInstanceInfo() {
        const server = new mastodon_server_1.default(this.homeserver);
        return await server.fetchServerInfo();
    }
    /**
     * Builds the webfinger URI for the account.
     * @private
     */
    buildWebfingerURI() {
        return (this.acct.includes("@") ? this.acct : `${this.acct}@${this.homeserver}`).toLowerCase();
    }
    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////
    /**
     * Build a dictionary from Accounts' webfingerURIs to the Account object for easy lookup.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {AccountNames} Dictionary from webfingerURI to Account.
     */
    static buildAccountNames(accounts) {
        return (0, collection_helpers_1.keyByProperty)(accounts, acct => acct.webfingerURI);
    }
    /**
     * Dictionary from account's webfingerURI to number of times it appears in 'accounts' argument.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {StringNumberDict} Dictionary from webfingerURI to count.
     */
    static countAccounts(accounts) {
        return Object.values(this.countAccountsWithObj(accounts)).reduce((counts, accountWithCount) => {
            counts[accountWithCount.account.webfingerURI] = accountWithCount.count;
            return counts;
        }, {});
    }
    /**
     * Dictionary from account's webfingerURI to an object with the account and count.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {AccountCount} Dictionary from webfingerURI to {account, count}.
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
     * @param {Account[]} accounts - Array of Account objects.
     * @param {string} [logPrefix='logSuspendedAccounts()'] - Log prefix.
     */
    static logSuspendedAccounts(accounts, logPrefix = 'logSuspendedAccounts()') {
        accounts.filter(a => !!a.suspended).forEach(a => {
            console.warn(`${(0, string_helpers_1.bracketed)(logPrefix)} Found suspended account:`, a);
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