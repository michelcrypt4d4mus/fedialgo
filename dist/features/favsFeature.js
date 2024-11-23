"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function favFeature(api) {
    let results = [];
    let pages = 3;
    try {
        for await (const page of api.v1.favourites.list({ limit: 80 })) {
            results = results.concat(page);
            pages--;
            if (pages === 0 || results.length < 80) {
                break;
            }
        }
    }
    catch (e) {
        console.error(e);
        return {};
    }
    const favFrequ = results.reduce((accumulator, toot) => {
        if (!toot.account)
            return accumulator;
        if (toot.account.acct in accumulator) {
            accumulator[toot.account.acct] += 1;
        }
        else {
            accumulator[toot.account.acct] = 1;
        }
        return accumulator;
    }, {});
    console.log(`favFrequ: `, favFrequ);
    return favFrequ;
}
exports.default = favFeature;
;
//# sourceMappingURL=favsFeature.js.map