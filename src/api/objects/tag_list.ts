/*
 * A list of tags with usage counts.
 */
import MastoApi from "../api";
import Toot from "./toot";
import { MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../../types";
import { sortObjsByProps } from "../../helpers/collection_helpers";
import { wordRegex } from "../../helpers/string_helpers";

const SORT_TAGS_BY = [
    "numToots" as keyof TagWithUsageCounts,
    "name" as keyof TagWithUsageCounts
];


export default class TagList {
    tags: TagWithUsageCounts[];

    constructor(tags: MastodonTag[]) {
        this.tags = tags.map(tag => {
            const newTag = tag as TagWithUsageCounts;
            newTag.regex ||= wordRegex(tag.name);
            return newTag;
        });
    }

    // Alternate constructor, builds Tags with numToots set to the # of times the tag appears in the toots
    static fromUsageCounts(toots: Toot[]): TagList {
        const tagsWithUsageCounts = toots.reduce(
            (tagCounts, toot) => {
                toot.realToot().tags?.forEach((tag) => {
                    const newTag = tag as TagWithUsageCounts;
                    newTag.numToots ??= 0;

                    if (!(tag.name in tagCounts) && (newTag.numToots > 0)) {
                        console.warn(`countTags(): "${tag.name}" not in tagCounts but numToots is > 0`, tag);
                    }

                    tagCounts[tag.name] ??= newTag;
                    tagCounts[tag.name].numToots! += 1;
                });

                return tagCounts;
            },
            {} as TagNames
        );

        return new TagList(Object.values(tagsWithUsageCounts));
    }

    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites(): Promise<TagList> {
        return this.fromUsageCounts(await MastoApi.instance.getFavouritedToots());
    }

    static async fromFollowedTags(): Promise<TagList> {
        return new TagList(await MastoApi.instance.getFollowedTags());
    }

    static async fromParticipated(): Promise<TagList> {
        return this.fromUsageCounts(await MastoApi.instance.getRecentUserToots());
    }

    // Returns a dict of tag names to numToots
    numTootsLookupDict(): StringNumberDict {
        return this.tags.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {} as StringNumberDict);
    }

    // Return a dictionary of tag names to tags
    tagNameDict(): TagNames {
        return this.tags.reduce((tagNames, tag) => {
            tagNames[tag.name] = tag;
            return tagNames;
        }, {} as TagNames);
    }

    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags?: number): TagWithUsageCounts[] {
        const tags = sortObjsByProps(Object.values(this.tags), SORT_TAGS_BY, [false, true]);
        return numTags ? tags.slice(0, numTags) : tags;
    }
;}
