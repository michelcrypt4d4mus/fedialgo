import { mastodon } from "masto";
import { AccountNames } from "../../types";
type AccountLike = mastodon.v1.Account | mastodon.v1.StatusMention;
export declare function buildAccountNames(accounts: mastodon.v1.Account[]): AccountNames;
export declare function describeAccount(account: mastodon.v1.Account): string;
export declare function repairAccount(account: AccountLike): void;
export declare function extractServer(account: AccountLike): string;
export declare function webfingerURI(account: AccountLike): string;
export {};
