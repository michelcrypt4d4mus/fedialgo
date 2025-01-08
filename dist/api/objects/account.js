"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountNameWithEmojis = exports.webfingerURI = exports.extractServer = exports.repairAccount = exports.describeAccount = exports.buildAccountNames = void 0;
const helpers_1 = require("../../helpers");
const helpers_2 = require("../../helpers");
const api_1 = require("../api");
// Build a dict from the acct (e.g @user@server.com) to the Account object for easy lookup
function buildAccountNames(accounts) {
    return accounts.reduce((accountNames, account) => {
        repairAccount(account);
        accountNames[account.acct] = account;
        return accountNames;
    }, {});
}
exports.buildAccountNames = buildAccountNames;
;
// e.g. "Foobar (@foobar@mastodon.social)"
function describeAccount(account) {
    return `${account.displayName} (${account.acct})`;
}
exports.describeAccount = describeAccount;
;
// Inject the @server info to accounts on the user's home server
// TODO: home server needs to be removed from URL or links break!
function repairAccount(account) {
    account.url = api_1.MastoApi.instance.getAccountURL(account);
    account.acct = webfingerURI(account);
}
exports.repairAccount = repairAccount;
;
// 'https://journa.host/@dell' -> 'journa.host'
function extractServer(account) {
    return (0, helpers_2.extractDomain)(account.url) || "unknown.server";
}
exports.extractServer = extractServer;
;
// Inject the @server info to accounts on the user's home server
function webfingerURI(account) {
    if (account.acct.includes("@")) {
        return account.acct;
    }
    else {
        return `${account.acct}@${extractServer(account)}`;
    }
}
exports.webfingerURI = webfingerURI;
;
function accountNameWithEmojis(account, fontSize = helpers_1.DEFAULT_FONT_SIZE) {
    return (0, helpers_1.replaceEmojiShortcodesWithImageTags)(account.displayName, account.emojis || []);
}
exports.accountNameWithEmojis = accountNameWithEmojis;
;
//# sourceMappingURL=account.js.map