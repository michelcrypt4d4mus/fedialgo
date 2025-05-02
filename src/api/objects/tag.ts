/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
import { mastodon } from "masto";

import { countValues, sortKeysByValue } from "../../helpers/collection_helpers";
import { MastoApi } from "../../api/api";
import { StringNumberDict, TrendingTag } from "../../types";

const BROKEN_TAG = "<<BROKEN_TAG>>";


// Lowercase the tag name and URL
export function repairTag(tag: mastodon.v1.Tag): mastodon.v1.Tag {
    if (!tag.name?.length) {
        console.warn(`Broken tag object:`, tag);
        tag.name = BROKEN_TAG;
    } else {
        tag.name = tag.name.toLowerCase();
    }

    tag.url = tag.url.toLowerCase();
    return tag;
};


// Count how many times the user has posted each tag
export async function participatedHashtags(): Promise<StringNumberDict> {
    const recentToots = await MastoApi.instance.getUserRecentToots();
    const hashtags = recentToots.flatMap(toot => toot.realToot().tags || []);
    return countValues<mastodon.v1.Tag>(hashtags, (tag) => tag.name);
};


// Count how many times the user has posted each tag
export async function participatedTags(): Promise<TrendingTag[]> {
    const tagCounts = await participatedHashtags();
    const popularTags = sortKeysByValue(tagCounts).slice(0, 20);  // TODO: make this configurable

    return popularTags.map(tagName => ({
        name: tagName,
        url: `https://mastodon.social/tags/${tagName}`, // TODO: unused (client links to the user's home server)
        numToots: tagCounts[tagName],
    } as TrendingTag));
};
