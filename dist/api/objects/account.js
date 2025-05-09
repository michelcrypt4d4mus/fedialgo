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
const class_transformer_1 = require("class-transformer");
const api_1 = __importDefault(require("../api"));
const collection_helpers_1 = require("../../helpers/collection_helpers");
const string_helpers_1 = require("../../helpers/string_helpers");
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
        accountObj.noindex = account.noindex || false;
        accountObj.limited = account.limited || false;
        accountObj.suspended = account.suspended || false;
        accountObj.roles = account.roles || [];
        // Fedialgo extension fields
        accountObj.isFollowed = false;
        accountObj.webfingerURI = accountObj.buildWebfingerURI();
        return accountObj;
    }
    // e.g. "Foobar (@foobar@mastodon.social)"
    describe() {
        return `${this.displayName} (${this.webfingerURI})`;
    }
    // displayName prop but with the custom emojis replaced with <img> tags
    displayNameWithEmojis() {
        return (0, string_helpers_1.replaceEmojiShortcodesWithImageTags)(this.displayName, this.emojis || []);
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
    // On the local server you just get the username so need to add the server domain
    buildWebfingerURI() {
        if (this.acct.includes("@")) {
            return this.acct;
        }
        else {
            return `${this.acct}@${this.homeserver()}`;
        }
    }
    ////////////////////////////
    //     Class Methods      //
    ////////////////////////////
    // Dictionary from account's webfingerURI to number of times it appears in 'accounts' argument
    // (Often it's just 1 time per webfingerURI and we are using this to make a quick lookup dictionary)
    static buildWebfingerUriLookup(accounts) {
        return (0, collection_helpers_1.countValues)(accounts, (account) => account.webfingerURI);
    }
    // Build a dictionary from the Account.webfingerURI to the Account object for easy lookup
    static buildAccountNames(accounts) {
        return (0, collection_helpers_1.keyByProperty)(accounts, acct => acct.webfingerURI);
    }
}
exports.default = Account;
__decorate([
    (0, class_transformer_1.Type)(() => Account),
    __metadata("design:type", Object)
], Account.prototype, "moved", void 0);
;
//# sourceMappingURL=account.js.map