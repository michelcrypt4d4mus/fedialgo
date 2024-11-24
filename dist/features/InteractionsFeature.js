"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const NUM_PAGES_TO_SCAN = 3;
const MIN_RECORDS = 80;
async function InteractionsFeature(api) {
    const results = await (0, helpers_1.mastodonFetchPages)(api.v1.notifications.list, NUM_PAGES_TO_SCAN, MIN_RECORDS);
    console.debug(`Retrieved notifications with InteractionsFeature() and mastodonFetchPages(): `, results);
    return results.reduce((interactionCount, notification) => {
        if (!notification.account)
            return interactionCount;
        const account = notification.account.acct;
        interactionCount[account] = (interactionCount[account] || 0) + 1;
        return interactionCount;
    }, {});
}
exports.default = InteractionsFeature;
;
//# sourceMappingURL=InteractionsFeature.js.map