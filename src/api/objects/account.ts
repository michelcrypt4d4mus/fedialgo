/*
 * Helper methods for dealing with Mastodon's Account objects.
 */
import { encode } from 'html-entities';
import { mastodon } from "masto";
import { Type } from "class-transformer";

import MastoApi from "../api";
import MastodonServer, { InstanceResponse } from '../mastodon_server';
import { config } from "../../config";
import { DEFAULT_FONT_SIZE, bracketed, extractDomain, replaceEmojiShortcodesWithImgTags } from "../../helpers/string_helpers";
import { keyByProperty } from "../../helpers/collection_helpers";
import { Logger } from "../../helpers/logger";
import { type AccountLike, type AccountNames, type BooleanFilterOption, type StringNumberDict } from "../../types";

type AccountCount = Record<string, {account: Account, count: number}>;

const NBSP_REGEX = /&nbsp;/g;
const ACCOUNT_JOINER = '  ●  ';
const ACCOUNT_CREATION_FMT: Intl.DateTimeFormatOptions = {year: "numeric", month: "short", day: "numeric"};

const logger = new Logger("Account");


/**
 * Interface for mastodon.v1.Account object extending with additional helper methods and properties.

 */
interface AccountObj extends mastodon.v1.Account {
    displayNameFullHTML?: () => string;
    displayNameWithEmojis?: () => string;
    homeInstanceInfo?: () => Promise<InstanceResponse>;
    asBooleanFilterOption: BooleanFilterOption;
    description: string;
    homeserver: string;
    localServerUrl: string;
    isFollowed?: boolean;
    isFollower?: boolean;
    noteWithAccountInfo: string;
    webfingerURI: string;  // NOTE: This is lost when we serialze the Account object
};


/**
 * Class representing a Mastodon Account with helper methods and additional properties.
 * Extends base Mastodon Account. The base class's properties are not documented here;
 * see {@link https://docs.joinmastodon.org/entities/Account/ the official docs} for details.
 * @implements {AccountObj}
 * @extends {mastodon.v1.Account}
 * @property {BooleanFilterOption} asBooleanFilterOption - Boolean filter option representation.
 * @property {string} description - A string describing the account (displayName + webfingerURI).
 * @property {string} homeserver - The account's home server domain.
 * @property {boolean} isLocal - True if this account is on the same Mastodon server as the Fedialgo user.
 * @property {string} localServerUrl - The account's URL on the user's home server.
 * @property {boolean} [isFollowed] - True if this account is followed by the Fedialgo user.
 * @property {boolean} [isFollower] - True if this account is following the Fedialgo user.
 * @property {string} noteWithAccountInfo - HTML with note, creation date, followers, and toots count.
 * @property {string} webfingerURI - The webfinger URI for the account.
 */
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
    limited?: boolean | null;
    @Type(() => Account) moved?: Account | null;
    noindex?: boolean;  // Don't index this account in search engines
    roles: mastodon.v1.Account["roles"] = [];  // TODO: not sure default is a good idea
    suspended?: boolean | null;
    // Fedialgo extension fields
    isFollowed?: boolean;  // Is this account followed by the user?
    isFollower?: boolean;  // Is this account following the user?
    webfingerURI!: string;

    // Returns the account properties used in BooleanFilter.
    get asBooleanFilterOption(): BooleanFilterOption {
        return {
            name: this.webfingerURI,
            displayName: this.displayName,
            displayNameWithEmoji: this.displayNameWithEmojis(),
            isFollowed: this.isFollowed,
        };
    }

    get description(): string { return `${this.displayName} (${this.webfingerURI})` };
    get homeserver(): string { return extractDomain(this.url) };
    get isLocal(): boolean { return MastoApi.instance.isLocalUrl(this.url) };
    get localServerUrl(): string { return MastoApi.instance.accountUrl(this) };

    // Returns HTML combining the note property with creation date, followers, and toots count
    get noteWithAccountInfo(): string {
        const txt = this.note.replace(NBSP_REGEX, " ");  // Remove non-breaking spaces so we can wrap the text
        const createdAt = new Date(this.createdAt);

        const accountStats = [
            `Created ${createdAt.toLocaleDateString(config.locale.locale, ACCOUNT_CREATION_FMT)}`,
            `${this.followersCount.toLocaleString()} Followers`,
            `${this.statusesCount.toLocaleString()} Toots`,
        ]

        return `${txt}<br /><p style="font-weight: bold; font-size: 13px;">[${accountStats.join(ACCOUNT_JOINER)}]</p>`;
    }

    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {AccountLike} account - The account data to build from.
     * @returns {Account} The constructed Account instance.
     */
    static build(account: AccountLike): Account {
        if (account instanceof Account) return account;  // Already an Account instance, return it directly

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
        accountObj.isFollowed = false;  // Must be set later, in Toot.complete() or manually get getFollowedAccounts()
        accountObj.isFollower = false;  // Must be set later, in Toot.complete() or manually get getFollowedAccounts()
        accountObj.webfingerURI = accountObj.buildWebfingerURI();
        return accountObj;
    }

    /**
     * Returns the display name with emojis <img> tags and webfinger URI in HTML.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    displayNameFullHTML(fontSize: number = DEFAULT_FONT_SIZE): string {
        return this.displayNameWithEmojis(fontSize) + encode(` (@${this.webfingerURI})`);
    }

    /**
     * Returns HTML-ish string that is the display name with custom emojis as <img> tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    displayNameWithEmojis(fontSize: number = DEFAULT_FONT_SIZE): string {
        return replaceEmojiShortcodesWithImgTags(this.displayName, this.emojis || [], fontSize);
    }

    /**
     * Gets the account's instance info from the API (note some servers don't provide this).
     * @returns {Promise<InstanceResponse>}
     */
    async homeInstanceInfo(): Promise<InstanceResponse> {
        const server = new MastodonServer(this.homeserver);
        return await server.fetchServerInfo();
    }

    /**
     * Builds the webfinger URI for the account.
     * @private
     */
    private buildWebfingerURI(): string {
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
    static buildAccountNames(accounts: Account[]): AccountNames {
        return keyByProperty<Account>(accounts, acct => acct.webfingerURI);
    }

    /**
     * Dictionary from account's webfingerURI to number of times it appears in 'accounts' argument.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {StringNumberDict} Dictionary from webfingerURI to count.
     */
    static countAccounts(accounts: Account[]): StringNumberDict {
        return Object.values(this.countAccountsWithObj(accounts)).reduce(
            (counts, accountWithCount) => {
                counts[accountWithCount.account.webfingerURI] = accountWithCount.count;
                return counts;
            },
            {} as StringNumberDict
        );
    }

    /**
     * Dictionary from account's webfingerURI to an object with the account and count.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {AccountCount} Dictionary from webfingerURI to {account, count}.
     */
    static countAccountsWithObj(accounts: Account[]): AccountCount {
        return accounts.reduce((counts, account) => {
            counts[account.webfingerURI] ??= {account, count: 0};
            counts[account.webfingerURI].count += 1;
            return counts;
        }, {} as AccountCount);
    }

    /**
     * Logs all suspended accounts in the provided array.
     * @param {Account[]} accounts - Array of Account objects.
     * @param {string} [logPrefix='logSuspendedAccounts()'] - Log prefix.
     */
    static logSuspendedAccounts(accounts: Account[], logPrefix: string): void {
        accounts.filter(a => !!a.suspended).forEach(a => {
            logger.warn(`${bracketed(logPrefix)} Found suspended account:`, a);
        });
    }
};
