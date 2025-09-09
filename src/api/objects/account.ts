/*
 * Helper methods for dealing with Mastodon's Account objects.
 */
import { encode } from 'html-entities';
import { mastodon } from "masto";
import { Type } from "class-transformer";

import MastoApi from "../api";
import MastodonServer from '../mastodon_server';
import { config } from "../../config";
import { keyByProperty } from "../../helpers/collection_helpers";
import { Logger } from "../../helpers/logger";
import {
    DEFAULT_FONT_SIZE,
    bracketed,
    extractDomain,
    replaceEmojiShortcodesWithImgTags
} from "../../helpers/string_helpers";
import {
    type AccountLike,
    type AccountNames,
    type BooleanFilterOption,
    type InstanceResponse,
    type StringNumberDict
} from "../../types";

type AccountCount = Record<string, {account: Account, count: number}>;

const NBSP_REGEX = /&nbsp;/g;
const ACCOUNT_JOINER = '  ●  ';
const ACCOUNT_CREATION_FMT: Intl.DateTimeFormatOptions = {year: "numeric", month: "short", day: "numeric"};

const logger = new Logger("Account");

/** Interface for mastodon.v1.Account object extending with additional helper methods and properties. */
interface AccountObj extends mastodon.v1.Account {
    displayNameFullHTML: (fontSize?: number) => string;
    displayNameWithEmojis: (fontSize?: number) => string;
    homeInstanceInfo: () => Promise<InstanceResponse>;
    noteWithAccountInfo: (fontSize?: number) => string;
    asBooleanFilterOption: BooleanFilterOption;
    description: string;
    homeserver: string;
    localServerUrl: string;
    isFollowed?: boolean;
    isFollower?: boolean;
    webfingerURI: string;  // NOTE: This is lost when we serialze the Account object
};


/**
 * Extends base Mastodon {@link https://docs.joinmastodon.org/entities/Account/ Account} with
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
export default class Account implements AccountObj {
    // Identifying properties
    acct!: string;
    id!: string;
    username!: string;
    // Other poperties
    createdAt!: string;
    displayName!: string;
    followersCount!: number;
    followingCount!: number;
    lastStatusAt!: string;
    note!: string;  // Profile bio, in plain-text instead of in HTML.
    statusesCount!: number;
    url!: string;
    // Image URLs
    avatar!: string;
    avatarStatic!: string;
    header!: string;
    headerStatic!: string;
    // Boolean flags
    bot!: boolean;  // Would have been better to be named "isBot"
    discoverable!: boolean;
    group!: boolean;
    limited?: boolean | null;
    locked!: boolean;
    noindex?: boolean;  // Don't index this account in search engines
    suspended?: boolean | null;
    // Arrays and optional fields
    emojis!: mastodon.v1.CustomEmoji[];
    fields!: mastodon.v1.AccountField[];
    roles: mastodon.v1.Account["roles"] = [];  // TODO: not sure default is a good idea
    // Optional fields
    @Type(() => Account) moved?: Account | null;
    // Fedialgo extension fields
    isFollowed?: boolean;  // Is this account followed by the user?
    isFollower?: boolean;  // Is this account following the user?
    webfingerURI!: string;

    // Returns this account's properties that can be used by the BooleanFilter class.
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

    // Build the full webfinger URI for this account by appending the homeserver if necessary.
    private get buildWebfingerURI(): string {
        return (this.acct.includes("@") ? this.acct : `${this.acct}@${this.homeserver}`).toLowerCase();
    }

    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {AccountLike} account - The Mastodon Account (or similar) to build from.
     * @returns {Account} Constructed Account instance with extra methods and properties.
     */
    static build(account: AccountLike): Account {
        if (account instanceof Account) return account;  // Already an Account instance so return it

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
        accountObj.isFollowed = false;  // Must be set later, in Toot.complete() or manually get getFollowedAccounts()
        accountObj.isFollower = false;  // Must be set later, in Toot.complete() or manually get getFollowedAccounts()
        accountObj.webfingerURI = accountObj.buildWebfingerURI;  // Memoized for future use

        return accountObj;
    }

    /**
     * Returns HTML-ish string combining the displayName (with custom emojis as {@linkcode <img>} tags)
     * and the {@linkcode webfingerURI}.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji {@linkcode <img>} tags. Should match surrounding txt.
     * @returns {string}
     */
    displayNameFullHTML(fontSize: number = DEFAULT_FONT_SIZE): string {
        return this.displayNameWithEmojis(fontSize) + encode(` (@${this.webfingerURI})`);
    }

    /**
     * Returns HTML-ish string that is the display name with custom emojis as {@linkcode <img>} tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji {@linkcode <img>} tags. Should match surrounding txt.
     * @returns {string}
     */
    displayNameWithEmojis(fontSize: number = DEFAULT_FONT_SIZE): string {
        return replaceEmojiShortcodesWithImgTags(this.displayName, this.emojis || [], fontSize);
    }

    /**
     * Get this account's Mastodon server (AKA {@link https://docs.joinmastodon.org/entities/Instance/ Instance})
     * from API. Note that not all servers provide this!
     * @returns {Promise<InstanceResponse>}
     */
    async homeInstanceInfo(): Promise<InstanceResponse> {
        const server = new MastodonServer(this.homeserver);
        return await server.fetchServerInfo();
    }

    /**
     * HTML combining the account bio (AKA the {@linkcode Account.note} property) with {@linkcode createdAt},
     * follower count, and toots count.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size of returned HTML text (not just emoji {@linkcode <img>} tags).
     * @returns {Promise<InstanceResponse>}
     */
    noteWithAccountInfo(fontSize: number = DEFAULT_FONT_SIZE): string {
        const txt = this.note.replace(NBSP_REGEX, " ");  // Remove non-breaking spaces so we can wrap the text
        const createdAt = new Date(this.createdAt);

        const accountStats = [
            `Created ${createdAt.toLocaleDateString(config.locale.locale, ACCOUNT_CREATION_FMT)}`,
            `${this.followersCount.toLocaleString()} Followers`,
            `${this.statusesCount.toLocaleString()} Toots`,
        ]

        const noteHTML = `${txt}<br /><p style="font-weight: bold; font-size: ${fontSize}px;">`
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
    static buildAccountNames(accounts: Account[]): AccountNames {
        return keyByProperty<Account>(accounts, acct => acct.webfingerURI);
    }

    /**
     * Dictionary from account's {@linkcode webfingerURI} to number of times it appears in the
     * {@linkcode accounts} argument.
     * @param {Account[]} accounts - Array of {@linkcode Account} objects.
     * @returns {StringNumberDict} Dictionary from {@linkcode webfingerURI} to count of appearances.
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
     * Dictionary from account's {@linkcode webfingerURI} to an object with the account and count.
     * @param {Account[]} accounts - Array of {@linkcode Account} objects.
     * @returns {AccountCount} Dictionary from {@linkcode webfingerURI} to {account, count}.
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
     * @param {Account[]} accounts - Array of {@linkcode Account} objects.
     * @param {string} [logPrefix='logSuspendedAccounts()'] - Log prefix.
     */
    static logSuspendedAccounts(accounts: Account[], logPrefix: string): void {
        accounts.filter(a => !!a.suspended).forEach(a => {
            logger.warn(`${bracketed(logPrefix)} Found suspended account:`, a);
        });
    }
};
