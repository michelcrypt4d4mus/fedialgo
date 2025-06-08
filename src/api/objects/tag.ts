/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
import MastoApi from "../../api/api";
import { detectHashtagLanguage } from "../../helpers/language_helper";
import { removeDiacritics } from "../../helpers/string_helpers";
import { type TagWithUsageCounts } from "../../types";

const BROKEN_TAG = "<<BROKEN_TAG>>";


// Lowercase the tag name, replace URL with one on homeserver
export function repairTag(tag: TagWithUsageCounts): TagWithUsageCounts {
    const language = detectHashtagLanguage(tag.name);
    if (language) tag.language = language;  // Don't set unnecessarily for storage space reasons

    if (!tag.name?.length) {
        console.warn(`Broken tag object:`, tag);
        tag.name = BROKEN_TAG;
    } else if (!language) {
        // If it's not a non-Latin language tag remove diacritics // TODO: should we remove diacritics?
        tag.name = removeDiacritics(tag.name.toLowerCase());
    }

    if (MastoApi.instance) {
        tag.url = MastoApi.instance.tagUrl(tag)
    } else {
        console.warn(`MastoApi.instance is null!`);
        tag.url = tag.url.toLowerCase() || "";
    }

    return tag;
};


// Create a string representation of the tag with its usage counts & language
export function tagInfoStr(tag: TagWithUsageCounts) {
    const infoStr = `${tag.numToots} numToots` + (tag.language ? `, language: ${tag.language}` : "");
    return `${tag.name} (${infoStr})`;
};
