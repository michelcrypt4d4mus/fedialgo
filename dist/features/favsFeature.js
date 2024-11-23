"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const NUM_PAGES = 3;
const MAX_RECORDS = 80;
async function favFeature(api) {
    // let results: mastodon.v1.Status[] = [];
    let results = await (0, helpers_1.mastodonFetchPages)(api.v1.favourites.list, NUM_PAGES, MAX_RECORDS);
    console.log(`Retrieved faves with favFeaturE() AND mastodonFetchPages(): `, results);
    const favFrequ = results.reduce((accumulator, toot) => {
        if (!toot.account)
            return accumulator;
        if (toot.account.acct in accumulator) {
            accumulator[toot.account.acct] += 1;
        }
        else {
            accumulator[toot.account.acct] = 1;
        }
        return accumulator;
    }, {});
    console.log(`favFrequ: `, favFrequ);
    return favFrequ;
}
exports.default = favFeature;
;
//# sourceMappingURL=favsFeature.js.map