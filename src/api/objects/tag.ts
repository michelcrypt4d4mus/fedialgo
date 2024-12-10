/*
 * Helper methods for dealing with Mastodon's Tag objects.
 */
import { mastodon } from "masto";

import Storage from "../../Storage";
import { TrendingTag } from "../../types";


// Lowercase the tag text; inject toot / account counts summed over last NUM_DAYS_TO_COUNT_TAG_DATA.
export function decorateTrendingTag(tag: mastodon.v1.Tag): TrendingTag {
    const trendingTag = tag as TrendingTag;
    trendingTag.name = trendingTag.name.toLowerCase();

    if (!trendingTag?.history || trendingTag.history.length == 0) {
        console.warn(`decorateTrendingTag() found no history for tag:`, trendingTag);
        trendingTag.history = [];
    }

    const recentHistory = trendingTag.history.slice(0, Storage.getConfig().numDaysToCountTrendingTagData);
    trendingTag.numToots = recentHistory.reduce((total, h) => total + parseInt(h.uses), 0);
    trendingTag.numAccounts = recentHistory.reduce((total, h) => total + parseInt(h.accounts), 0);
    return trendingTag;
};
