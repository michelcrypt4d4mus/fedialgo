/*
 * Helper methods for dealing with Mastodon's Tag objects.
 */
import { mastodon } from "masto";


// Lowercase the tag name
export function repairTag(tag: mastodon.v1.Tag) {
    tag.name = tag.name.toLowerCase();
};
