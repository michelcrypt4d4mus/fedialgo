"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MAX_PAGES_OF_USER_TOOTS = 3;
const MAX_TOOTS_TO_SCAN = 100;
async function getReblogsFeature(api, user) {
    let recentToots = [];
    let pageNumber = 0;
    try {
        for await (const page of api.v1.accounts.$select(user.id).statuses.list({ limit: MAX_TOOTS_TO_SCAN })) {
            recentToots = recentToots.concat(page);
            pageNumber++;
            console.log(`Retrieved page ${pageNumber} of current user's toots...`);
            if (pageNumber == MAX_PAGES_OF_USER_TOOTS || recentToots.length >= MAX_TOOTS_TO_SCAN) {
                console.log(`Halting old toot retrieval at page ${pageNumber} with ${recentToots.length} toots)...`);
                break;
            }
        }
    }
    catch (e) {
        console.error(e);
        return {};
    }
    const recentRetoots = recentToots.filter(status => status?.reblog);
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
exports.default = getReblogsFeature;
