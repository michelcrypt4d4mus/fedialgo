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


    const favFrequ = results.reduce((accumulator: AccountFeature, status: mastodon.v1.Status,) => {
        if (!status.account) return accumulator;
        if (status.account.acct in accumulator) {
            accumulator[status.account.acct] += 1;
        } else {
            accumulator[status.account.acct] = 1;
        }
        return accumulator
    }, {})

    return favFrequ;
}
