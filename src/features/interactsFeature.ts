/*
 * This feature will return a dictionary with the number of interactions with other accounts in the last
 * pages of notifications.
 */
import { mastodon } from "masto";

import { AccountFeature } from "../types";
import { mastodonFetchPages } from "../helpers";

const NUM_PAGES_TO_SCAN = 3;
const MIN_RECORDS = 80;


export default async function interactFeature(api: mastodon.rest.Client): Promise<AccountFeature> {
    let results = await mastodonFetchPages<mastodon.v1.Notification>(
        api.v1.notifications.list,
        NUM_PAGES_TO_SCAN,
        MIN_RECORDS
    );

    console.log(`Retrieved notifications with interactFeature() AND mastodonFetchPages(): `, results);

    const interactFrequ = results.reduce((accumulator: Record<string, number>, status: mastodon.v1.Notification) => {
        if (!status.account) return accumulator;

        if (status.account.acct in accumulator) {
            accumulator[status.account.acct] += 1;
        } else {
            accumulator[status.account.acct] = 1;
        }

        return accumulator
    }, {})

    return interactFrequ;
};
