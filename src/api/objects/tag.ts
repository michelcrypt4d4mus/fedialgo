/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
import MastoApi from "../../api/api";
import Toot from "./toot";
import { incrementCount } from "../../helpers/collection_helpers";
import { MastodonTag, StringNumberDict, TagNames } from "../../types";
import { removeDiacritics } from "../../helpers/string_helpers";

const BROKEN_TAG = "<<BROKEN_TAG>>";


// Build a lookup table of tag names to tag objects
export function buildTagNames(tags: MastodonTag[]): TagNames {
    return tags.reduce((tagNames: TagNames, tag: MastodonTag) => {
        tagNames[tag.name] = tag;
        return tagNames;
    }, {} as TagNames);
};


// Count up the number of tags that appear in a set of toots
export function countTags(toots: Toot[]): StringNumberDict {
    return toots.reduce(
        (tagCounts: StringNumberDict, toot: Toot) => {
            toot.realToot().tags?.forEach(tag => incrementCount(tagCounts, tag.name));
            return tagCounts;
        },
        {} as StringNumberDict
    );
};


// Lowercase the tag name, replace URL with one on homeserver
export function repairTag(tag: MastodonTag): MastodonTag {
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

    return tag;
};
