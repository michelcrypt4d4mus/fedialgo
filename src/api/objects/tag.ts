/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
import MastoApi from "../../api/api";
import { MastodonTag, TagNames } from "../../types";

const BROKEN_TAG = "<<BROKEN_TAG>>";


// Lowercase the tag name, replace URL with one on homeserver
export function repairTag(tag: MastodonTag): MastodonTag {
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


// Build a lookup table of tag names to tag objects
export function buildTagNames(tags: MastodonTag[]): TagNames {
    return tags.reduce((tagNames: TagNames, tag: MastodonTag) => {
        tagNames[tag.name] = tag;
        return tagNames;
    }, {} as TagNames);
};
