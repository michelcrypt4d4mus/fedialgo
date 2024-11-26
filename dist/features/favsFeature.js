"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
async function FavsFeature(api) {
    const results = await (0, helpers_1.mastodonFetchPages)({
        fetchMethod: api.v1.favourites.list,
        label: 'favorites'
    });
    console.log(`Retrieved faves with FavsFeature() AND mastodonFetchPages(): `, results);
    return results.reduce((favoriteCounts, toot) => {
        if (!toot.account)
            return favoriteCounts;
        favoriteCounts[toot.account.acct] = (favoriteCounts[toot.account.acct] || 0) + 1;
        return favoriteCounts;
    }, {});
}
exports.default = FavsFeature;
;
//# sourceMappingURL=favsFeature.js.map