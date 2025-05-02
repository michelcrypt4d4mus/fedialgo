/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
import { mastodon } from "masto";

import { countValues } from "../../helpers/collection_helpers";
import { MastoApi } from "../../api/api";
import { StringNumberDict } from "../../types";

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


// Count how many times th euser has used a given tag
export async function participatedHashtags(): Promise<StringNumberDict> {
    const recentToots = await MastoApi.instance.getUserRecentToots();
    const hashtags = recentToots.flatMap(toot => toot.realToot().tags || []);
    return countValues<mastodon.v1.Tag>(hashtags, (tag) => tag.name);
};
