/**
 * @fileoverview Helper methods for dealing with Mastodon's {@link https://docs.joinmastodon.org/entities/Tag/ Tag}
 * objects.
 */
import MastoApi from "../../api/api";
import { config } from "../../config";
import { createRandomString, optionalSuffix, removeDiacritics, wordRegex } from "../../helpers/string_helpers";
import { detectForeignScriptLanguage } from "../../helpers/language_helper";
import { type TagWithUsageCounts } from "../../types";

const BROKEN_TAG = "<<BROKEN_TAG>>";


/**
 * Build a synthetic {@linkcode TagWithUsageCounts} for a given string.
 * @param {string} str - The string to turn into a {@linkcode TagWithUsageCounts}
 * @returns {TagWithUsageCounts}
 */
export function buildTag(str: string): TagWithUsageCounts {
    const name = str.trim().toLowerCase();

    return {
        name,
        id: createRandomString(16),  // Generate a random ID for the tag. // TODO: same str should return the same ID?
        regex: wordRegex(name),
        url: MastoApi.instance.tagUrl(name),
    };
}


/** Returns true for hashtags that can count as existing in a Toot even if the "#" character wasn't used. */
export function isValidForSubstringSearch(tag: TagWithUsageCounts): boolean {
    return (tag.name.length > 1 && !config.toots.tagOnlyStrings.has(tag.name))
}


/** Lowercase the tag name, replace URL with one on homeserver. */
export function repairTag(tag: TagWithUsageCounts): TagWithUsageCounts {
    const language = detectForeignScriptLanguage(tag.name);
    if (language) tag.language = language;  // Don't set 'language' prop unnecessarily for space reasons

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
        console.warn(`MastoApi.instance is null, can't get homeserver tag URL for tag:`, tag);
        tag.url = tag.url.toLowerCase() || "";
    }

    return tag;
}


/** Create a string representation of the tag with its usage counts & language. */
export function tagInfoStr(tag: TagWithUsageCounts) {
    const infoStr = `${tag.numToots} numToots${optionalSuffix(tag.language)}`;
    return `${tag.name} (${infoStr})`;
}
