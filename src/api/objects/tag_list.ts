/*
 * A list of tags with usage counts.
 */
import MastoApi from "../api";
import MastodonServer from "../mastodon_server";
import Toot from "./toot";
import UserData from "../user_data";
import { CacheKey, MastodonTag, StringNumberDict, TagNames, TagWithUsageCounts } from "../../types";
import { config, TagTootsConfig } from "../../config";
import { sortObjsByProps, truncateToConfiguredLength } from "../../helpers/collection_helpers";
import { traceLog } from "../../helpers/log_helpers";
import { wordRegex } from "../../helpers/string_helpers";

type TagTootsCacheKey = CacheKey.PARTICIPATED_TAG_TOOTS
    | CacheKey.FAVOURITED_HASHTAG_TOOTS
    | CacheKey.TRENDING_TAG_TOOTS;

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
        await this.removeMutedTags();
        await this.removeFollowedTags();
    };

    // Screen a list of hashtags against the user's followed tags, removing any that are followed.
    async removeFollowedTags(): Promise<void> {
        const followedKeywords = (await MastoApi.instance.getFollowedTags()).map(t => t.name);
        this.removeKeywordsFromTags(followedKeywords);
    };

    // Remove the configured list of invalid trending tags
    // TODO: TagTootsConfig could have an invalidTags property...
    removeInvalidTrendingTags(): void {
        this.removeKeywordsFromTags(config.trending.tags.invalidTrendingTags);
    };

    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags(): Promise<void> {
        this.removeKeywordsFromTags(await UserData.getMutedKeywords());
    };

    // Remove any trending tags from a list of tags
    async removeTrendingTags(): Promise<void> {
        const trendingTagList = await TagList.fromTrending();
        this.removeKeywordsFromTags(trendingTagList.tags.map(t => t.name));
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
        this.tags = sortObjsByProps(Object.values(this.tags), SORT_TAGS_BY, [false, true]);
        return numTags ? this.tags.slice(0, numTags) : this.tags;
    }

    // Remove tags that match any of the keywords
    private async removeKeywordsFromTags(keywords: string[]): Promise<void> {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validTags = this.tags.filter(tag => !keywords.includes(tag.name));

        if (validTags.length != this.tags.length) {
            traceLog(`Filtered out ${this.tags.length - validTags.length} tags:`, this.tags);
        }

        this.tags = validTags;
    };
};


export class TagsForTootsList {
    cacheKey: TagTootsCacheKey;
    tagList: TagList;
    tootsConfig: TagTootsConfig;

    // Alternate constructor
    static async create(cacheKey: TagTootsCacheKey): Promise<TagsForTootsList> {
        let tootsConfig: TagTootsConfig;
        let tagList: TagList;

        if (cacheKey === CacheKey.FAVOURITED_HASHTAG_TOOTS) {
            tootsConfig = config.favouritedTags;
            tagList = await TagList.fromFavourites();
            await tagList.removeFollowedAndMutedTags();
            await tagList.removeTrendingTags();
            tagList.removeInvalidTrendingTags();
        } else if (cacheKey === CacheKey.PARTICIPATED_TAG_TOOTS) {
            tootsConfig = config.participatedTags;
            tagList = await TagList.fromParticipated();
            await tagList.removeFollowedAndMutedTags();
            await tagList.removeTrendingTags();
        } else if (cacheKey === CacheKey.TRENDING_TAG_TOOTS) {
            tootsConfig = config.trending.tags;
            tagList = await TagList.fromTrending();
        } else {
            throw new Error(`TagsForTootsList: Invalid cacheKey ${cacheKey}`);
        }

        return new TagsForTootsList(cacheKey, tagList, tootsConfig);
    }

    // Create then immediately fetch toots for the tags
    static async getTootsForTags(cacheKey: TagTootsCacheKey): Promise<Toot[]> {
        const tagList = await TagsForTootsList.create(cacheKey);
        return await tagList.getCacheableTootsForTags();
    }

    private constructor(cacheKey: TagTootsCacheKey, tagList: TagList, tootsConfig: TagTootsConfig) {
        this.tagList = tagList;
        this.cacheKey = cacheKey;
        this.tootsConfig = tootsConfig;
    }

    // Return numTags tags sorted by numToots then by name (return all if numTags is not set)
    topTags(numTags?: number): TagWithUsageCounts[] {
        numTags ||= this.tootsConfig.numTags;
        return truncateToConfiguredLength(this.tagList.topTags(), numTags, this.cacheKey);
    }

    // Get toots for a list of tags, caching the results
    async getCacheableTootsForTags(): Promise<Toot[]> {
        return await MastoApi.instance.getCacheableToots(
            async () => await MastoApi.instance.getStatusesForTags(this.topTags(), this.tootsConfig.numTootsPerTag),
            this.cacheKey,
            this.tootsConfig.maxToots,
        );
    };
};


// // Get toots for hashtags the user has favourited a lot
// export async function getFavouritedTagToots(): Promise<Toot[]> {
//     return await TagsForTootsList.getTootsForTags(CacheKey.FAVOURITED_HASHTAG_TOOTS);
// };


// // Get recent toots from hashtags the user has participated in frequently
// export async function getParticipatedHashtagToots(): Promise<Toot[]> {
//     return await TagsForTootsList.getTootsForTags(CacheKey.PARTICIPATED_TAG_TOOTS);
// };


// // Get toots for the top trending tags via the search endpoint.
// export async function getRecentTootsForTrendingTags(): Promise<Toot[]> {
//     return await TagsForTootsList.getTootsForTags(CacheKey.TRENDING_TAG_TOOTS);
// };
