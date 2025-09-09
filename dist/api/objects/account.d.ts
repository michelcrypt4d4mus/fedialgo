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
     * @param {AccountLike} account - The Mastodon Account (or similar) to build from.
     * @returns {Account} Constructed Account instance with extra methods and properties.
     */
    static build(account: AccountLike): Account;
    /**
     * Returns HTML-ish string combining the displayName (with custom emojis as {@linkcode <img>} tags)
     * and the {@linkcode webfingerURI}.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji {@linkcode <img>} tags. Should match surrounding txt.
     * @returns {string}
     */
    displayNameFullHTML(fontSize?: number): string;
    /**
     * Returns HTML-ish string that is the display name with custom emojis as {@linkcode <img>} tags.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size in pixels of any emoji {@linkcode <img>} tags. Should match surrounding txt.
     * @returns {string}
     */
    displayNameWithEmojis(fontSize?: number): string;
    /**
     * Get this account's Mastodon server (AKA {@link https://docs.joinmastodon.org/entities/Instance/ Instance})
     * from API. Note that not all servers provide this!
     * @returns {Promise<InstanceResponse>}
     */
    homeInstanceInfo(): Promise<InstanceResponse>;
    /**
     * HTML combining the account bio (AKA the {@linkcode Account.note} property) with {@linkcode createdAt},
     * follower count, and toots count.
     * @param {number} [fontSize=DEFAULT_FONT_SIZE] - Size of returned HTML text (not just emoji {@linkcode <img>} tags).
     * @returns {Promise<InstanceResponse>}
     */
    noteWithAccountInfo(fontSize?: number): string;
    /**
     * Build a dictionary from Accounts' {@linkcode webfingerURI} to the {@linkcode Account} object for easy lookup.
     * @param {Account[]} accounts - Array of Account objects.
     * @returns {AccountNames} Dictionary from webfingerURI to Account.
     */
    static buildAccountNames(accounts: Account[]): AccountNames;
    /**
     * Dictionary from account's {@linkcode webfingerURI} to number of times it appears in the
     * {@linkcode accounts} argument.
     * @param {Account[]} accounts - Array of {@linkcode Account} objects.
     * @returns {StringNumberDict} Dictionary from {@linkcode webfingerURI} to count of appearances.
     */
    static countAccounts(accounts: Account[]): StringNumberDict;
    /**
     * Dictionary from account's {@linkcode webfingerURI} to an object with the account and count.
     * @param {Account[]} accounts - Array of {@linkcode Account} objects.
     * @returns {AccountCount} Dictionary from {@linkcode webfingerURI} to {account, count}.
     */
    static countAccountsWithObj(accounts: Account[]): AccountCount;
    /**
     * Logs all suspended accounts in the provided array.
     * @param {Account[]} accounts - Array of {@linkcode Account} objects.
     * @param {string} [logPrefix='logSuspendedAccounts()'] - Log prefix.
     */
    static logSuspendedAccounts(accounts: Account[], logPrefix: string): void;
}
export {};
