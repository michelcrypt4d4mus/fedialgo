"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const NUM_PAGES_TO_SCAN = 3;
const MIN_RECORDS = 80;
async function interactFeature(api) {
    let results = await (0, helpers_1.mastodonFetchPages)(api.v1.notifications.list, NUM_PAGES_TO_SCAN, MIN_RECORDS);
    console.log(`Retrieved notifications with interactFeature() AND mastodonFetchPages(): `, results);
    const interactFrequ = results.reduce((accumulator, status) => {
        if (!status.account)
            return accumulator;
        if (status.account.acct in accumulator) {
            accumulator[status.account.acct] += 1;
        }
        else {
            accumulator[status.account.acct] = 1;
        }
        return accumulator;
    }, {});
    return interactFrequ;
}
exports.default = interactFeature;
//# sourceMappingURL=interactsFeature.js.map