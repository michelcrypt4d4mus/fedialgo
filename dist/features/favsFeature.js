"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const NUM_PAGES = 3;
const MAX_RECORDS = 80;
async function FavsFeature(api) {
    const results = await (0, helpers_1.mastodonFetchPages)(api.v1.favourites.list, NUM_PAGES, MAX_RECORDS);
    console.debug(`Retrieved faves with FavsFeature() AND mastodonFetchPages(): `, results);
    const favFrequ = results.reduce((favoriteCounts, toot) => {
        if (!toot.account)
            return favoriteCounts;
        favoriteCounts[toot.account.acct] = (favoriteCounts[toot.account.acct] || 0) + 1;
        return favoriteCounts;
    }, {});
    console.log(`FavsFeature favFrequ: `, favFrequ);
    return favFrequ;
}
exports.default = FavsFeature;
;
//# sourceMappingURL=favsFeature.js.map