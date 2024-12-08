import { mastodon } from "masto";
import { AccountNames } from "../../types";
export declare function buildAccountNames(accounts: mastodon.v1.Account[]): AccountNames;
export declare function extractServer(account: mastodon.v1.Account): string;
