/*
 * A list of tags with usage counts.
 */
import MastoApi from "../api";
import MastodonServer from "../mastodon_server";
import Toot from "./toot";
import UserData from "../user_data";
import { config, TagTootsConfig } from "../../config";
import { MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../../types";
import { sortObjsByProps } from "../../helpers/collection_helpers";
import { traceLog } from "../../helpers/log_helpers";
import { truncateToConfiguredLength } from "../../helpers/collection_helpers";
import { bracketed, wordRegex } from "../../helpers/string_helpers";

const SORT_TAGS_BY = [
    "numToots" as keyof TagWithUsageCounts,
    "name" as keyof TagWithUsageCounts
];


export default class TagList {
    tags: TagWithUsageCounts[];
    tootsConfig?: TagTootsConfig;

    constructor(tags: MastodonTag[], config?: TagTootsConfig) {
        this.tags = tags.map(tag => {
            const newTag = tag as TagWithUsageCounts;
            newTag.regex ||= wordRegex(tag.name);
            return newTag;
        });

        this.tootsConfig = config;
    }

    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites(): Promise<TagList> {
        const participatedTags = (await TagList.fromParticipated()).tagNameDict();
        const tagList = this.fromUsageCounts(await MastoApi.instance.getFavouritedToots(), config.favouritedTags);
        await tagList.removeTrendingTags(bracketed('TagList.fromFavourites()'));
        await tagList.removeFollowedAndMutedTags();

        // Filter out tags that are already followed or have high participation by the fedialgo user
        tagList.tags = tagList.tags.filter((tag) => {
            if (config.trending.tags.invalidTrendingTags.includes(tag.name)) {
                return false;
            } else if ((participatedTags[tag.name]?.numToots || 0) >= 2) { // TODO: make this a config value or (better) a heuristic based on the data
                return false;
            } else {
                return true;
            }
        });

        return tagList;
    }

    // Tags the user follows  // TODO: could look for tags in the accounts they follow too
    static async fromFollowedTags(): Promise<TagList> {
        return new TagList(await MastoApi.instance.getFollowedTags());
    }

    // Tags the user has posted in
    static async fromParticipated(): Promise<TagList> {
        const tagList = this.fromUsageCounts(await MastoApi.instance.getRecentUserToots(), config.participatedTags);
        await tagList.removeTrendingTags(bracketed('TagList.fromParticipated()'));
        await tagList.removeFollowedAndMutedTags();
        return tagList;
    }

    // Trending tags across the fediverse
    static async fromTrending(): Promise<TagList> {
        const tagList = new TagList(await MastodonServer.fediverseTrendingTags(), config.trending.tags);
        tagList.removeFollowedAndMutedTags();
        return tagList;
    }

    // Alternate constructor, builds Tags with numToots set to the # of times the tag appears in the toots
    private static fromUsageCounts(toots: Toot[], cfg?: TagTootsConfig): TagList {
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

        return new TagList(Object.values(tagsWithUsageCounts), cfg);
    }

    // Returns a dict of tag names to numToots
    numTootsLookupDict(): StringNumberDict {
        return this.tags.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {} as StringNumberDict);
    }

    // Filter out any tags that are muted or followed
    async removeFollowedAndMutedTags(): Promise<void> {
        await this.removeMutedTags();
        await this.removeFollowedTags();
    };


    // Screen a list of hashtags against the user's followed tags, removing any that are followed.
    async removeFollowedTags(): Promise<void> {
        const followedKeywords = (await MastoApi.instance.getFollowedTags()).map(t => t.name);
        this.removeKeywordsFromTags(followedKeywords, "[removeFollowedTags()]");
    };

    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags(): Promise<void> {
        const mutedKeywords = await UserData.getMutedKeywords();
        this.removeKeywordsFromTags(mutedKeywords, "[removeMutedTags()]");
    };

    // Remove any trending tags from a list of tags
    async removeTrendingTags(logPrefix?: string): Promise<void> {
        const trendingTagList = await TagList.fromTrending();
        this.removeKeywordsFromTags(trendingTagList.tags.map(t => t.name), logPrefix);
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
        numTags ||= this.tootsConfig?.numTags;
        this.tags = sortObjsByProps(Object.values(this.tags), SORT_TAGS_BY, [false, true]);
        return numTags ? truncateToConfiguredLength(this.tags, numTags, "topTags()") : this.tags;
    }

    // Remove tags that match any of the keywords
    private async removeKeywordsFromTags(keywords: string[], logPrefix?: string): Promise<void> {
        logPrefix ||= "[removeKeywordsFromTags()]";
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validTags = this.tags.filter(tag => !keywords.includes(tag.name));

        if (validTags.length != this.tags.length) {
            traceLog(`${logPrefix} Filtered out ${this.tags.length - validTags.length} tags:`, this.tags);
        }

        this.tags = validTags;
    };
;}
