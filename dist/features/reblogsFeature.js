"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
async function reblogsFeature(api, user) {
    const recentToots = await (0, helpers_1.mastodonFetchPages)(api.v1.accounts.$select(user.id).statuses.list);
    const recentRetoots = recentToots.filter(toot => toot?.reblog);
    console.log(`Recent toot history: `, recentToots);
    console.log(`Recent retoot history: `, recentRetoots);
    // Count retoots per user
    return recentRetoots.reduce((counts, toot) => {
        const retootOfAccount = toot?.reblog?.account?.acct;
        if (!retootOfAccount)
            return counts;
        counts[retootOfAccount] = (counts[retootOfAccount] || 0) + 1;
        return counts;
    }, {});
}
exports.default = reblogsFeature;
;
//# sourceMappingURL=reblogsFeature.js.map