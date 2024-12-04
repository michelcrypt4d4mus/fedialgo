"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAccountNames = void 0;
function buildAccountNames(accounts) {
    return accounts.reduce((accountNames, account) => {
        accountNames[account.acct] = account;
        return accountNames;
    }, {});
}
exports.buildAccountNames = buildAccountNames;
//# sourceMappingURL=account.js.map