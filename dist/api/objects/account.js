"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractServer = exports.buildAccountNames = void 0;
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
    return account.url?.split("/")[2] || "unknown.server";
}
exports.extractServer = extractServer;
;
//# sourceMappingURL=account.js.map