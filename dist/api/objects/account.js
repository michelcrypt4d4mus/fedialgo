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
const NBSP_REGEX = /&nbsp;/g;
const ACCOUNT_JOINER = '  ●  ';
const ACCOUNT_CREATION_FMT = { year: "numeric", month: "short", day: "numeric" };
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
    roles = []; // TODO: not sure default is a good idea
    // Fedialgo extension fields
    isFollowed; // Is this account followed by the user?
    webfingerURI;
    // Alternate constructor because class-transformer doesn't work with constructor arguments
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
        accountObj.isFollowed = false; // Must be set later, in Toot.complete() etc.
        accountObj.webfingerURI = accountObj.buildWebfingerURI();
        return accountObj;
    }
    // e.g. "Foobar (@foobar@mastodon.social)"
    describe() {
        return `${this.displayName} (${this.webfingerURI})`;
    }
    // HTML encoded displayNameWithEmojis() + " (@webfingerURI)"
    displayNameFullHTML() {
        return this.displayNameWithEmojis() + (0, html_entities_1.encode)(` (@${this.webfingerURI})`);
    }
    // return HTML-ish string of displayName prop but with the custom emojis replaced with <img> tags
    displayNameWithEmojis(fontSize = string_helpers_1.DEFAULT_FONT_SIZE) {
        return (0, string_helpers_1.replaceEmojiShortcodesWithImageTags)(this.displayName, this.emojis || [], fontSize);
    }
    // Get the account's instance info from the API (note some servers don't provide this)
    async homeInstanceInfo() {
        const server = new mastodon_server_1.default(this.homeserver());
        return await server.fetchServerInfo();
    }
    // 'https://journa.host/@dell' -> 'journa.host'
    homeserver() {
        return (0, string_helpers_1.extractDomain)(this.url) || "unknown.server";
    }
    // Return the URL to the account on the fedialgo user's home server
    homserverURL() {
        if (this.homeserver() == api_1.default.instance.homeDomain) {
            return this.url;
        }
        else {
            return `https://${api_1.default.instance.homeDomain}/@${this.webfingerURI}`;
        }
    }
    // Returns HTML combining the "note" property with the creation date, followers and toots count
    noteWithAccountInfo() {
        let txt = this.note.replace(NBSP_REGEX, " "); // Remove non-breaking spaces so we can wrap the text
        const createdAt = new Date(this.createdAt);
        const accountStats = [
            `Created ${createdAt.toLocaleDateString(config_1.config.locale.locale, ACCOUNT_CREATION_FMT)}`,
            `${this.followersCount.toLocaleString()} Followers`,
            `${this.statusesCount.toLocaleString()} Toots`,
        ];
        return `${txt}<br /><p style="font-weight: bold; font-size: 13px;">[${accountStats.join(ACCOUNT_JOINER)}]</p>`;
    }
    ;
    // On the local server you just get the username so need to add the server domain
    buildWebfingerURI() {
        if (this.acct.includes("@")) {
            return this.acct.toLowerCase();
        }
        else {
            return `${this.acct}@${this.homeserver()}`.toLowerCase();
        }
    }
    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////
    // Build a dictionary from the Account.webfingerURI to the Account object for easy lookup
    static buildAccountNames(accounts) {
        return (0, collection_helpers_1.keyByProperty)(accounts, acct => acct.webfingerURI);
    }
    // Dictionary from account's webfingerURI to number of times it appears in 'accounts' argument
    // (Often it's just 1 time per webfingerURI and we are using this to make a quick lookup dictionary)
    static countAccounts(accounts) {
        return Object.values(this.countAccountsWithObj(accounts)).reduce((counts, accountWithCount) => {
            counts[accountWithCount.account.webfingerURI] = accountWithCount.count;
            return counts;
        }, {});
    }
    static countAccountsWithObj(accounts) {
        return accounts.reduce((counts, account) => {
            counts[account.webfingerURI] ??= { account, count: 0 };
            counts[account.webfingerURI].count += 1;
            return counts;
        }, {});
    }
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