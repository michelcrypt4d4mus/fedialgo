"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAccountNames = void 0;
// Build a dict from the acct (e.g @user@server.com) to the Account object for easy lookup
function buildAccountNames(accounts) {
    return accounts.reduce((accountNames, account) => {
        accountNames[account.acct] = account;
        return accountNames;
    }, {});
}
exports.buildAccountNames = buildAccountNames;
;
//# sourceMappingURL=account.js.map