"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const NUM_PAGES_TO_SCAN = 3;
const MIN_RECORDS = 80;
async function interactFeature(api) {
    const results = await (0, helpers_1.mastodonFetchPages)(api.v1.notifications.list, NUM_PAGES_TO_SCAN, MIN_RECORDS);
    console.log(`Retrieved notifications with interactFeature() and mastodonFetchPages(): `, results);
    const interactFrequ = results.reduce((interactionCount, notification) => {
        if (!notification.account)
            return interactionCount;
        interactionCount[notification.account.acct] = (interactionCount[notification.account.acct] || 0) + 1;
        return interactionCount;
    }, {});
    return interactFrequ;
}
exports.default = interactFeature;
;
//# sourceMappingURL=interactsFeature.js.map