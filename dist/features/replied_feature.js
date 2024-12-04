"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../api/api");
async function repliedFeature(api, user, recentToots) {
    recentToots ||= await (0, api_1.getUserRecentToots)(api, user);
    const recentReplies = recentToots.filter(toot => toot?.inReplyToAccountId);
    console.log(`Recent reply history: `, recentReplies);
    // Count replied per user. Note that this does NOT pull the Account object because that
    // would require a lot of API calls, so it's just working with the account ID which is NOT
    // unique across all servers.
    return recentReplies.reduce((counts, toot) => {
        if (!toot?.inReplyToAccountId)
            return counts;
        counts[toot.inReplyToAccountId] = (counts[toot.inReplyToAccountId] || 0) + 1;
        return counts;
    }, {});
}
exports.default = repliedFeature;
;
//# sourceMappingURL=replied_feature.js.map