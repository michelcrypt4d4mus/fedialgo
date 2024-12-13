/*
 * Helper methods for dealing with Mastodon's Account objects.
 */
import { mastodon } from "masto";

import { extractDomain } from "../../helpers";
import { AccountNames } from "../../types";

type AccountLike = mastodon.v1.Account | mastodon.v1.StatusMention;


// Build a dict from the acct (e.g @user@server.com) to the Account object for easy lookup
export function buildAccountNames(accounts: mastodon.v1.Account[]): AccountNames {
    return accounts.reduce(
        (accountNames, account) => {
            repairAccount(account);
            accountNames[account.acct] = account;
            return accountNames;
        },
        {} as AccountNames
    );
};


// e.g. "Foobar (@foobar@mastodon.social)"
export function describeAccount(account: mastodon.v1.Account): string {
    return `${account.displayName} (${account.acct})`;
};


// Inject the @server info to accounts on the user's home server
// TODO: home server needs to be removed from URL or links break!
export function repairAccount(account: AccountLike): void {
    account.acct = webfingerURI(account);
}


// 'https://journa.host/@dell' -> 'journa.host'
export function extractServer(account: AccountLike): string {
    return extractDomain(account.url) || "unknown.server";
};


// Inject the @server info to accounts on the user's home server
export function webfingerURI(account: AccountLike): string {
    if (account.acct.includes("@")) {
        return account.acct;
    } else {
        return `${account.acct}@${extractServer(account)}`;
    }
};
