"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../api/api");
const types_1 = require("../types");
async function FavsFeature(api, _user) {
    const results = await (0, api_1.mastodonFetchPages)({
        fetch: api.v1.favourites.list,
        label: types_1.WeightName.FAVORITED_ACCOUNTS
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
//# sourceMappingURL=most_favorited_accounts.js.map