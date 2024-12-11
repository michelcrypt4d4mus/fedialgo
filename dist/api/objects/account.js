"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webfingerURI = exports.describeAccount = exports.extractServer = exports.buildAccountNames = void 0;
const helpers_1 = require("../../helpers");
// Build a dict from the acct (e.g @user@server.com) to the Account object for easy lookup
function buildAccountNames(accounts) {
    return accounts.reduce((accountNames, account) => {
        accountNames[account.acct] = account;
        return accountNames;
    }, {});
}
exports.buildAccountNames = buildAccountNames;
;
// 'https://journa.host/@dell' -> 'journa.host'
function extractServer(account) {
    return (0, helpers_1.extractDomain)(account.url) || "unknown.server";
}
exports.extractServer = extractServer;
;
// e.g. "Foobar (@foobar@mastodon.social)"
function describeAccount(account) {
    return `${account.displayName} (${account.acct})`;
}
exports.describeAccount = describeAccount;
;
// Inject the @server info to accounts on the user's home server
const webfingerURI = (account) => {
    if (account.acct.includes("@")) {
        return account.acct;
    }
    else {
        return `${account.acct}@${extractServer(account)}`;
    }
};
exports.webfingerURI = webfingerURI;
//# sourceMappingURL=account.js.map