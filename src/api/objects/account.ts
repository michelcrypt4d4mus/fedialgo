/*
 * Helper methods for dealing with mastodon Account objects.
 */
import { mastodon } from "masto";

import { AccountNames } from "../../types";


// Build a dict from the acct (e.g @user@server.com) to the Account object for easy lookup
export function buildAccountNames(accounts: mastodon.v1.Account[]): AccountNames {
    return accounts.reduce(
        (accountNames, account) => {
            accountNames[account.acct] = account;
            return accountNames;
        },
        {} as AccountNames
    );
};
