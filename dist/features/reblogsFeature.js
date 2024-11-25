"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRecentToots = void 0;
const helpers_1 = require("../helpers");
async function reblogsFeature(api, user, recentToots) {
    recentToots ||= await getUserRecentToots(api, user);
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
function getUserRecentToots(api, user) {
    return (0, helpers_1.mastodonFetchPages)(api.v1.accounts.$select(user.id).statuses.list);
}
exports.getUserRecentToots = getUserRecentToots;
;
//# sourceMappingURL=reblogsFeature.js.map