/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
import MastoApi from "../../api/api";
import { detectHashtagLanguage } from "../../helpers/language_helper";
import { MastodonTag, TagNames, TagWithUsageCounts } from "../../types";
import { removeDiacritics } from "../../helpers/string_helpers";

const BROKEN_TAG = "<<BROKEN_TAG>>";


// Build a lookup table of tag names to tag objects
export function buildTagNames(tags: MastodonTag[]): TagNames {
    return tags.reduce((tagNames: TagNames, tag: MastodonTag) => {
        tagNames[tag.name] as TagWithUsageCounts;
        return tagNames;
    }, {} as TagNames);
};


// Lowercase the tag name, replace URL with one on homeserver
export function repairTag(tag: TagWithUsageCounts): TagWithUsageCounts {
    if (!tag.name?.length) {
        console.warn(`Broken tag object:`, tag);
        tag.name = BROKEN_TAG;
    } else {
        tag.name = removeDiacritics(tag.name.toLowerCase());
    }

    if (MastoApi.instance) {
        tag.url = MastoApi.instance.tagUrl(tag)
    } else {
        console.warn(`MastoApi.instance is null!`);
        tag.url = tag.url.toLowerCase() || "";
    }

    const language = detectHashtagLanguage(tag.name);
    if (language) tag.language = language;  // Don't set unnecessarily for storage space reasons
    return tag;
};


export const tagStr = (tag: TagWithUsageCounts) => `${tag.name} (${tag.numToots} numToots, language: ${tag.language})`;
