/*
 * Compute which accounts this user favorites the most often lately.
 */
import { mastodon } from "masto";

import { AccountFeature } from "../types";


export default async function favFeature(api: mastodon.rest.Client): Promise<AccountFeature> {
    let results: mastodon.v1.Status[] = [];
    let pages = 3;

    try {
        for await (const page of api.v1.favourites.list({ limit: 80 })) {
            results = results.concat(page)
            pages--;

            if (pages === 0 || results.length < 80) {
                break;
            }
        }
    } catch (e) {
        console.error(e)
        return {};
    }

    const favFrequ = results.reduce((accumulator: AccountFeature, toot: mastodon.v1.Status,) => {
        if (!toot.account) return accumulator;

        if (toot.account.acct in accumulator) {
            accumulator[toot.account.acct] += 1;
        } else {
            accumulator[toot.account.acct] = 1;
        }

        return accumulator;
    }, {})

    console.log(`favFrequ: `, favFrequ);
    return favFrequ;
};
