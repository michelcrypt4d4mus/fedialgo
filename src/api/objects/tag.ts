/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
import { mastodon } from "masto";

import { countValues, sortKeysByValue } from "../../helpers/collection_helpers";
import MastoApi from "../../api/api";
import { StringNumberDict, TrendingTag } from "../../types";

const BROKEN_TAG = "<<BROKEN_TAG>>";


// Lowercase the tag name, replace URL with one on homeserver
export function repairTag(tag: mastodon.v1.Tag): mastodon.v1.Tag {
    if (!tag.name?.length) {
        console.warn(`Broken tag object:`, tag);
        tag.name = BROKEN_TAG;
    } else {
        tag.name = tag.name.toLowerCase();
    }

    if (MastoApi.instance) {
        tag.url = MastoApi.instance.tagURL(tag)
    } else {
        console.warn(`MastoApi.instance is null!`);
        tag.url = tag.url.toLowerCase() || "";
    }

    return tag;
};
