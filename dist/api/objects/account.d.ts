import { mastodon } from "masto";
import { type AccountLike, type AccountNames, type BooleanFilterOption, type InstanceResponse, type StringNumberDict } from "../../types";
type AccountCount = Record<string, {
    account: Account;
    count: number;
}>;
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
    webfingerURI: string;
}
/**
 * Class representing a Mastodon Account with helper methods and additional properties.
 * Extends base Mastodon Account. The base class's properties are not documented here;
 * see {@link https://docs.joinmastodon.org/entities/Account/ the official docs} for details.
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
    acct: string;
    id: string;
    username: string;
    createdAt: string;
    displayName: string;
    followersCount: number;
    followingCount: number;
    lastStatusAt: string;
    note: string;
    statusesCount: number;
    url: string;
    avatar: string;
    avatarStatic: string;
    header: string;
    headerStatic: string;
    bot: boolean;
    discoverable: boolean;
    group: boolean;
    limited?: boolean | null;
    locked: boolean;
    noindex?: boolean;
    suspended?: boolean | null;
    emojis: mastodon.v1.CustomEmoji[];
    fields: mastodon.v1.AccountField[];
    roles: mastodon.v1.Account["roles"];
    moved?: Account | null;
    isFollowed?: boolean;
    isFollower?: boolean;
    webfingerURI: string;
    get asBooleanFilterOption(): BooleanFilterOption;
    get description(): string;
    get homeserver(): string;
    get isLocal(): boolean;
    get localServerUrl(): string;
    private get buildWebfingerURI();
    /**
     * Alternate constructor because class-transformer doesn't work with constructor arguments.
     * @param {AccountLike} account - The account data to build from.
     * @returns {Account} The constructed Account instance.
     */
    static build(account: AccountLike): Account;
    /**
     * Returns the display name with emoji <img> tags and webfinger URI in HTML.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji <img> tags. Should match surrounding txt.
     * @returns {string}
     */
    displayNameFullHTML(fontSize?: number): string;
    /**
     * Returns HTML-ish string that is the display name with custom emoji <img> tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji <img> tags. Should match surrounding txt.
     * @returns {string}
     */
    displayNameWithEmojis(fontSize?: number): string;
    /**
     * Get this account's Mastodon server (AKA "Instance") info from API. Note that not all servers provide this!
     * @returns {Promise<InstanceResponse>}
     */
    homeInstanceInfo(): Promise<InstanceResponse>;
    /**
     * HTML combining account's bio (AKA the "note" property) with creation date, followers, and toots count.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size of returned HTML text (not just emoji <img> tags).
     * @returns {Promise<InstanceResponse>}
     */
    noteWithAccountInfo(fontSize?: number): string;
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
    static logSuspendedAccounts(accounts: Account[], logPrefix: string): void;
}
export {};
