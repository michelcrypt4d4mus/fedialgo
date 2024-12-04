"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../api");
async function InteractionsFeature(api) {
    const results = await (0, api_1.mastodonFetchPages)({
        fetchMethod: api.v1.notifications.list,
        label: 'notifications'
    });
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