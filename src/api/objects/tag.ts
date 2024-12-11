/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
import { mastodon } from "masto";

const BROKEN_TAG = "<<BROKEN_TAG>>";


// Lowercase the tag name and URL
export function repairTag(tag: mastodon.v1.Tag): mastodon.v1.Tag {
    tag.name = tag.name?.length ? tag.name.toLowerCase() : BROKEN_TAG;
    tag.url = tag.url.toLowerCase();
    return tag;
};
