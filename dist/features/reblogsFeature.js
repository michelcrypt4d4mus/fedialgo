"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const MAX_PAGES_OF_USER_TOOTS = 3;
const MAX_TOOTS_TO_SCAN = 100;
// mastodon.v1.ListAccountStatusesParams
async function reblogsFeature(api, user) {
    let recentToots = await (0, helpers_1.mastodonFetchPages)(api.v1.accounts.$select(user.id).statuses.list, MAX_PAGES_OF_USER_TOOTS, MAX_TOOTS_TO_SCAN);
    const recentRetoots = recentToots.filter(toot => toot?.reblog);
    console.log(`Recent toot history: `, recentToots);
    console.log(`Recent retoot history: `, recentRetoots);
    // Count retoots per user
    const retootedUserCounts = recentRetoots.reduce((counts, toot) => {
        if (!toot?.reblog?.account?.acct)
            return counts;
        if (toot.reblog.account.acct in counts) {
            counts[toot.reblog.account.acct] += 1;
        }
        else {
            counts[toot.reblog.account.acct] = 1;
        }
        return counts;
    }, {});
    console.log(`Most retooted users retootedUserCounts: `, retootedUserCounts);
    return retootedUserCounts;
}
exports.default = reblogsFeature;
;
//# sourceMappingURL=reblogsFeature.js.map