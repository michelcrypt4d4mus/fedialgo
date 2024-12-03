"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
async function FavsFeature(api) {
    const results = await (0, helpers_1.mastodonFetchPages)({
        fetchMethod: api.v1.favourites.list,
        label: 'favourites'
    });
    console.log(`Retrieved faves with FavsFeature() AND mastodonFetchPages(): `, results);
    return results.reduce((favouriteCounts, toot) => {
        if (!toot.account)
            return favouriteCounts;
        favouriteCounts[toot.account.acct] = (favouriteCounts[toot.account.acct] || 0) + 1;
        return favouriteCounts;
    }, {});
}
exports.default = FavsFeature;
;
//# sourceMappingURL=favsFeature.js.map