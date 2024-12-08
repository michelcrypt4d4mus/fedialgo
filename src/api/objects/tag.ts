import { mastodon } from "masto";

import Storage from "../../Storage";
import { TrendingTag } from "../../types";


// Lowercase the tag text; inject toot / account counts summed over last NUM_DAYS_TO_COUNT_TAG_DATA.
export function decorateTrendingTag(_tag: mastodon.v1.Tag): TrendingTag {
    let tag = _tag as TrendingTag;
    tag.name = tag.name.toLowerCase();

    if (!tag?.history || tag.history.length == 0) {
        console.warn(`decorateTrendingTag() found no history for tag:`, tag);
        tag.history = [];
    }

    const recentHistory = tag.history.slice(0, Storage.getConfig().numDaysToCountTrendingTagData);
    tag.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    tag.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
    return tag;
};
