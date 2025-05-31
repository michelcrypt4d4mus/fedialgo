/*
 * A list of tags with usage counts.
 */
import MastoApi from "./api";
import MastodonServer from "./mastodon_server";
import Toot from "./objects/toot";
import UserData from "./user_data";
import { config } from "../config";
import { Logger } from '../helpers/logger';
import { repairTag } from "./objects/tag";
import { sortObjsByProps } from "../helpers/collection_helpers";
import { wordRegex } from "../helpers/string_helpers";
import {
    type MastodonTag,
    type StringNumberDict,
    type TagNames,
    type TagWithUsageCounts
} from "../types";


const logger = new Logger("TagList");

const SORT_TAGS_BY = [
    "numToots" as keyof TagWithUsageCounts,
    "name" as keyof TagWithUsageCounts
];


export default class TagList {
    tags: TagWithUsageCounts[];

    constructor(tags: MastodonTag[]) {
        this.tags = tags.map(tag => {
            const newTag = tag as TagWithUsageCounts;
            repairTag(newTag);
            newTag.regex ||= wordRegex(tag.name);
            return newTag;
        });
    }

    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites(): Promise<TagList> {
        return this.fromUsageCounts(await MastoApi.instance.getFavouritedToots());
    }

    // Tags the user follows  // TODO: could look for tags in the accounts they follow too
    static async fromFollowedTags(): Promise<TagList> {
        return new this(await MastoApi.instance.getFollowedTags());
    }

    // Tags the user has posted in
    static async fromParticipated(): Promise<TagList> {
        return this.fromUsageCounts(await MastoApi.instance.getRecentUserToots());
    }

    // Trending tags across the fediverse
    static async fromTrending(): Promise<TagList> {
        const tagList = new this(await MastodonServer.fediverseTrendingTags());
        tagList.removeFollowedAndMutedTags();
        tagList.removeInvalidTrendingTags();
        return tagList;
    }

    // Alternate constructor, builds Tags with numToots set to the # of times the tag appears in the toots
    static fromUsageCounts(toots: Toot[]): TagList {
        let retootsPct = toots.length ? (toots.filter(toot => !!toot.reblog).length / toots.length) : 0;

        const tagsWithUsageCounts = toots.reduce(
            (tagCounts, toot) => {
                // If the user is mostly a retooter count retweets as toots for the purposes of counting tags
                toot = (retootsPct > config.participatedTags.minPctToCountRetoots) ? toot.realToot() : toot;

                toot.tags.forEach((tag) => {
                    const newTag = Object.assign({}, tag) as TagWithUsageCounts;
                    newTag.numToots ??= 0;

                    if (!(tag.name in tagCounts) && (newTag.numToots > 0)) {
                        logger.warn(`<countTags()> "${tag.name}" not in tagCounts but numToots is > 0`, tag);
                    }

                    tagCounts[tag.name] ??= newTag;
                    tagCounts[tag.name].numToots! += 1;
                });

                return tagCounts;
            },
            {} as TagNames
        );

        return new this(Object.values(tagsWithUsageCounts));
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
        await this.removeFollowedTags();
        await this.removeMutedTags();
    };

    // Screen a list of hashtags against the user's followed tags, removing any that are followed.
    async removeFollowedTags(): Promise<void> {
        const followedKeywords = (await MastoApi.instance.getFollowedTags()).map(t => t.name);
        this.removeKeywordsFromTags(followedKeywords);
    };

    // Remove the configured list of invalid trending tags as well as japanese/korean etc. tags
    removeInvalidTrendingTags(): void {
        this.removeKeywordsFromTags(config.trending.tags.invalidTags);
        this.tags = this.tags.filter(tag => (!tag.language) || (tag.language == config.locale.language));
    };

    // Remove tags that match any of the keywords
    removeKeywordsFromTags(keywords: string[]): void {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validTags = this.tags.filter(tag => !keywords.includes(tag.name));

        if (validTags.length != this.tags.length) {
            logger.trace(`Removed ${this.tags.length - validTags.length} tags matching keywords "${keywords}":`, this.tags);
        }

        this.tags = validTags;
    };

    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags(): Promise<void> {
        this.removeKeywordsFromTags(await UserData.getMutedKeywords());
    };

    // Return a dictionary of tag names to tags
    tagNameDict(): TagNames {
        return this.tags.reduce((tagNames, tag) => {
            tagNames[tag.name] = tag;
            return tagNames;
        }, {} as TagNames);
    }

    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags?: number): TagWithUsageCounts[] {
        this.tags = sortObjsByProps(Object.values(this.tags), SORT_TAGS_BY, [false, true]);
        return numTags ? this.tags.slice(0, numTags) : this.tags;
    }
};
