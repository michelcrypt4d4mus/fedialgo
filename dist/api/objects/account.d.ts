import { mastodon } from "masto";
import { InstanceResponse } from '../mastodon_server';
import { type AccountLike, type AccountNames, type BooleanFilterOption, type StringNumberDict } from "../../types";
type AccountCount = Record<string, {
    account: Account;
    count: number;
}>;
/**
 * Interface for Account object with additional helper methods and properties.
 * @interface
 * @typedef {object} AccountObj
 * @property {() => string} [describe] - Returns a string description of the account.
 * @property {() => string} [displayNameFullHTML] - Returns the display name with emojis and webfinger URI in HTML.
 * @property {() => string} [displayNameWithEmojis] - Returns the display name with custom emojis as <img> tags.
 * @property {() => Promise<InstanceResponse>} [homeInstanceInfo] - Gets the account's instance info from the API.
 * @property {string} homeserver - The account's home server domain.
 * @property {string} homserverURL - The account's URL on the user's home server.
 * @property {boolean} [isFollowed] - Whether this account is followed by the user.
 * @property {boolean} [isFollower] - Whether this account is following the user.
 * @property {string} noteWithAccountInfo - HTML with note, creation date, followers, and toots count.
 * @property {BooleanFilterOption} asBooleanFilterOption - Boolean filter option representation.
 * @property {string} webfingerURI - The webfinger URI for the account.
 */
interface AccountObj extends mastodon.v1.Account {
    describe?: () => string;
    displayNameFullHTML?: () => string;
    displayNameWithEmojis?: () => string;
    homeInstanceInfo?: () => Promise<InstanceResponse>;
    homeserver: string;
    homserverURL: string;
    isFollowed?: boolean;
    isFollower?: boolean;
    noteWithAccountInfo: string;
    asBooleanFilterOption: BooleanFilterOption;
    webfingerURI: string;
}
/**
 * Class representing a Mastodon Account with helper methods and additional properties.
 * Extends base Mastodon Account: https://docs.joinmastodon.org/entities/Account/
 * @implements {AccountObj}
 * @extends {mastodon.v1.Account}
 */
export default class Account implements AccountObj {
    id: string;
    username: string;
    acct: string;
    bot: boolean;
    createdAt: string;
    discoverable: boolean;
    displayName: string;
    followersCount: number;
    followingCount: number;
    group: boolean;
    lastStatusAt: string;
    locked: boolean;
    note: string;
    statusesCount: number;
    url: string;
    emojis: mastodon.v1.CustomEmoji[];
    fields: mastodon.v1.AccountField[];
    avatar: string;
    avatarStatic: string;
    header: string;
    headerStatic: string;
    noindex?: boolean;
    moved?: Account | null;
    suspended?: boolean | null;
    limited?: boolean | null;
    roles: mastodon.v1.Account["roles"];
    isFollowed: boolean;
    isFollower: boolean;
    webfingerURI: string;
    /**
     * Returns the account properties used in BooleanFilter.
     * @returns {BooleanFilterOption}
     */
    get asBooleanFilterOption(): BooleanFilterOption;
    /**
     * Returns the account's home server domain (e.g. 'journa.host').
     * @returns {string}
     */
    get homeserver(): string;
    /**
     * Returns the URL to the account on the user's home server.
     * @returns {string}
     */
    get homserverURL(): string;
    /**
     * Returns HTML combining the note property with creation date, followers, and toots count.
     * @returns {string}
     */
    get noteWithAccountInfo(): string;
    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {AccountLike} account - The account data to build from.
     * @returns {Account} The constructed Account instance.
     */
    static build(account: AccountLike): Account;
    /**
     * Returns a string description of the account (e.g. "Foobar (@foobar@mastodon.social)").
     * @returns {string}
     */
    describe(): string;
    /**
     * Returns the display name with emojis and webfinger URI in HTML.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    displayNameFullHTML(fontSize?: number): string;
    /**
     * Returns HTML-ish string that is the display name with custom emojis as <img> tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE]
     * @returns {string}
     */
    displayNameWithEmojis(fontSize?: number): string;
    /**
     * Gets the account's instance info from the API (note some servers don't provide this).
     * @returns {Promise<InstanceResponse>}
     */
    homeInstanceInfo(): Promise<InstanceResponse>;
    /**
     * Builds the webfinger URI for the account.
     * @private
     */
    private buildWebfingerURI;
    /**
     * Build a dictionary from Accounts' webfingerURIs to the Account object for easy lookup.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {AccountNames} Dictionary from webfingerURI to Account.
     */
    static buildAccountNames(accounts: Account[]): AccountNames;
    /**
     * Dictionary from account's webfingerURI to number of times it appears in 'accounts' argument.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {StringNumberDict} Dictionary from webfingerURI to count.
     */
    static countAccounts(accounts: Account[]): StringNumberDict;
    /**
     * Dictionary from account's webfingerURI to an object with the account and count.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {AccountCount} Dictionary from webfingerURI to {account, count}.
     */
    static countAccountsWithObj(accounts: Account[]): AccountCount;
    /**
     * Logs all suspended accounts in the provided array.
     * @param {Account[]} accounts - Array of Account objects.
     * @param {string} [logPrefix='logSuspendedAccounts()'] - Log prefix.
     */
    static logSuspendedAccounts(accounts: Account[], logPrefix?: string): void;
}
export {};
