"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../api/api");
const config_1 = require("../config");
async function FavsFeature(api, _user) {
    const results = await (0, api_1.mastodonFetchPages)({
        fetch: api.v1.favourites.list,
        label: config_1.WeightName.FAVORITED_ACCOUNTS
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