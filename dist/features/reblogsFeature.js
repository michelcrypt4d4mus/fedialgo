"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../api/api");
async function reblogsFeature(api, user, recentToots) {
    recentToots ||= await (0, api_1.getUserRecentToots)(api, user);
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