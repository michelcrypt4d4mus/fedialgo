/*
 * Helper methods for dealing with Mastodon's Account objects.
 */
import { encode } from 'html-entities';
import { mastodon } from "masto";
import { Type } from "class-transformer";

import MastoApi from "../api";
import MastodonServer, { InstanceResponse } from '../mastodon_server';
import { config } from "../../config";
import { DEFAULT_FONT_SIZE, bracketed, extractDomain, replaceEmojiShortcodesWithImageTags } from "../../helpers/string_helpers";
import { keyByProperty } from "../../helpers/collection_helpers";
import { Logger } from "../../helpers/logger";
import { type AccountLike, type AccountNames, type BooleanFilterOption,type StringNumberDict } from "../../types";

const NBSP_REGEX = /&nbsp;/g;
const ACCOUNT_JOINER = '  ●  ';
const ACCOUNT_CREATION_FMT: Intl.DateTimeFormatOptions = {year: "numeric", month: "short", day: "numeric"};

// TODO: isFollowed doesn't belong here...
type AccountCount = Record<string, {account: Account, count: number, isFollowed?: boolean}>;

const logger = new Logger("Account");

interface AccountObj extends mastodon.v1.Account {
    describe?: () => string;
    displayNameFullHTML?: () => string;
    displayNameWithEmojis?: () => string;
    homeInstanceInfo?: () => Promise<InstanceResponse>;
    homeserver?: () => string;
    homserverURL?: () => string;
    isFollowed?: boolean;
    isFollower?: boolean;
    noteWithAccountInfo?: () => string;
    webfingerURI: string;  // NOTE: This is lost when we serialze the Account object
};


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
    noindex?: boolean;  // Don't index this account in search engines
    @Type(() => Account) moved?: Account | null;
    suspended?: boolean | null;
    limited?: boolean | null;
    roles: mastodon.v1.Account["roles"] = [];  // TODO: not sure default is a good idea
    // Fedialgo extension fields
    isFollowed!: boolean;  // Is this account followed by the user?
    isFollower!: boolean;  // Is this account following the user?
    webfingerURI!: string;

    // Alternate constructor because class-transformer doesn't work with constructor arguments
    static build(account: AccountLike): Account {
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

    // e.g. "Foobar (@foobar@mastodon.social)"
    describe(): string {
        return `${this.displayName} (${this.webfingerURI})`;
    }

    // HTML encoded displayNameWithEmojis() + " (@webfingerURI)"
    displayNameFullHTML(): string {
        return this.displayNameWithEmojis() + encode(` (@${this.webfingerURI})`);
    }

    // return HTML-ish string of displayName prop but with the custom emojis replaced with <img> tags
    displayNameWithEmojis(fontSize: number = DEFAULT_FONT_SIZE): string {
        return replaceEmojiShortcodesWithImageTags(this.displayName, this.emojis || [], fontSize);
    }

    // Get the account's instance info from the API (note some servers don't provide this)
    async homeInstanceInfo(): Promise<InstanceResponse> {
        const server = new MastodonServer(this.homeserver());
        return await server.fetchServerInfo();
    }

    // 'https://journa.host/@dell' -> 'journa.host'
    homeserver(): string {
        return extractDomain(this.url) || "unknown.server";
    }

    // Return the URL to the account on the fedialgo user's home server
    homserverURL(): string {
        if (this.homeserver() == MastoApi.instance.homeDomain) {
            return this.url;
        } else {
            return `https://${MastoApi.instance.homeDomain}/@${this.webfingerURI}`;
        }
    }

    // Returns HTML combining the "note" property with the creation date, followers and toots count
    noteWithAccountInfo(): string {
        let txt = this.note.replace(NBSP_REGEX, " ");  // Remove non-breaking spaces so we can wrap the text
        const createdAt = new Date(this.createdAt);

        const accountStats = [
            `Created ${createdAt.toLocaleDateString(config.locale.locale, ACCOUNT_CREATION_FMT)}`,
            `${this.followersCount.toLocaleString()} Followers`,
            `${this.statusesCount.toLocaleString()} Toots`,
        ]

        return `${txt}<br /><p style="font-weight: bold; font-size: 13px;">[${accountStats.join(ACCOUNT_JOINER)}]</p>`;
    };

    // Extract the Account properties that are used in BooleanFilter
    toBooleanFilterOption(): BooleanFilterOption {
        return {
            name: this.webfingerURI,
            displayName: this.displayName,
            displayNameWithEmoji: this.displayNameWithEmojis(),
            isFollowed: this.isFollowed,
        };
    }

    // On the local server you just get the username so need to add the server domain
    private buildWebfingerURI(): string {
        if (this.acct.includes("@")) {
            return this.acct.toLowerCase();
        } else {
            return `${this.acct}@${this.homeserver()}`.toLowerCase();
        }
    }

    ////////////////////////////
    //     Static Methods     //
    ////////////////////////////

    // Build a dictionary from the Account.webfingerURI to the Account object for easy lookup
    static buildAccountNames(accounts: Account[]): AccountNames {
        return keyByProperty<Account>(accounts, acct => acct.webfingerURI);
    }

    // Dictionary from account's webfingerURI to number of times it appears in 'accounts' argument
    // (Often it's just 1 time per webfingerURI and we are using this to make a quick lookup dictionary)
    static countAccounts(accounts: Account[]): StringNumberDict {
        return Object.values(this.countAccountsWithObj(accounts)).reduce(
            (counts, accountWithCount) => {
                if (!accountWithCount.account.webfingerURI) {
                    const account = Account.build(accountWithCount.account);
                    const webfingerURI = account.buildWebfingerURI();
                    logger.warn(`countAccounts() - Account has no webfingerURI, setting to ${webfingerURI}`);
                    accountWithCount.account.webfingerURI = webfingerURI;
                }

                counts[accountWithCount.account.webfingerURI] = accountWithCount.count;
                return counts;
            },
            {} as StringNumberDict
        );
    }

    static countAccountsWithObj(accounts: Account[]): AccountCount {
        return accounts.reduce((counts, account) => {
            counts[account.webfingerURI] ??= {account, count: 0};
            counts[account.webfingerURI].count += 1;
            return counts;
        }, {} as AccountCount);
    }

    static logSuspendedAccounts(accounts: Account[], logPrefix: string = 'logSuspendedAccounts()'): void {
        accounts.filter(a => !!a.suspended).forEach(a => {
            console.warn(`${bracketed(logPrefix)} Found suspended account:`, a);
        });
    }
};
