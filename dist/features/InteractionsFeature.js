"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
async function InteractionsFeature(api) {
    const results = await (0, helpers_1.mastodonFetchPages)(api.v1.notifications.list);
    console.log(`Retrieved ${results.length} notifications for InteractionsFeature(): `, results);
    return results.reduce((interactionCount, notification) => {
        const account = notification?.account?.acct;
        if (!account)
            return interactionCount;
        interactionCount[account] = (interactionCount[account] || 0) + 1;
        return interactionCount;
    }, {});
}
exports.default = InteractionsFeature;
;
//# sourceMappingURL=InteractionsFeature.js.map