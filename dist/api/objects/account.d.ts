import { mastodon } from "masto";
import { AccountNames } from "../../types";
interface AccountObj extends mastodon.v1.Account {
    describe?: () => string;
    homeserver?: () => string;
    webfingerURI: string;
}
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
    moved?: mastodon.v1.Account | null | undefined;
    suspended?: boolean | null | undefined;
    limited?: boolean | null | undefined;
    roles: Pick<mastodon.v1.Role, "id" | "name" | "color">[];
    webfingerURI: string;
    constructor(account: mastodon.v1.Account);
    describe(): string;
    displayNameWithEmojis(): string;
    homeserver(): string;
    homserverURL(): string;
    serialize(): mastodon.v1.Account;
    private buildWebfingerURI;
    static buildAccountNames(accounts: Account[]): AccountNames;
}
export {};
