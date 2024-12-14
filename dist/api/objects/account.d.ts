import { mastodon } from "masto";
import { AccountLike, AccountNames } from "../../types";
export declare function buildAccountNames(accounts: mastodon.v1.Account[]): AccountNames;
export declare function describeAccount(account: mastodon.v1.Account): string;
export declare function repairAccount(account: AccountLike): void;
export declare function extractServer(account: AccountLike): string;
export declare function webfingerURI(account: AccountLike): string;
