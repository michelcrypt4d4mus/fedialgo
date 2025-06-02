/*
 * A list of tags with usage counts.
 */
import MastoApi from "./api";
import MastodonServer from "./mastodon_server";
import Toot from "./objects/toot";
import UserData from "./user_data";
import { config } from "../config";
import { isNull, wordRegex } from "../helpers/string_helpers";
import { Logger } from '../helpers/logger';
import { repairTag } from "./objects/tag";
import { sortObjsByProps } from "../helpers/collection_helpers";
import {
    type MastodonTag,
    type StringNumberDict,
    type TagNames,
    type TagWithUsageCounts
} from "../types";

const logger = new Logger("TagList");


export default class TagList {
    length: number;
    tagNames: TagNames = {};  // Dict of tag names to tags
    private _tags: TagWithUsageCounts[];

    constructor(tags: MastodonTag[]) {
        this._tags = tags.map(tag => {
            const newTag = tag as TagWithUsageCounts;
            repairTag(newTag);
            newTag.regex ||= wordRegex(tag.name);
            return newTag;
        });

        this.length = this._tags.length;
        this.tagNames = this.tagNameDict();
    }

    // Alternate constructor to create synthetic tags
    static buildFromDict(dict: StringNumberDict): TagList {
        const tags = Object.entries(dict).map(([name, numToots]) => {
            const tag: TagWithUsageCounts = { name, numToots, url: "blank" };
            return tag;
        });

        return new TagList(tags);
    }

    public get tags(): TagWithUsageCounts[] {
        return this._tags;
    }

    // Has side effect of mutating the 'tagNames' dict property
    public set tags(theTags: TagWithUsageCounts[]) {
        this._tags = theTags;
        this.length = this._tags.length;
        this.tagNames = this.tagNameDict();
    }

    // Remove elements that don't match the predicate(). Returns a new TagList object
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList {
        return new TagList(this.tags.filter(predicate));
    }

    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites(): Promise<TagList> {
        return TagList.fromUsageCounts(await MastoApi.instance.getFavouritedToots());
    }

    // Tags the user follows  // TODO: could look for tags in the accounts they follow too
    static async fromFollowedTags(): Promise<TagList> {
        return new TagList(await MastoApi.instance.getFollowedTags());
    }

    // Tags the user has posted in
    static async fromParticipated(): Promise<TagList> {
        return TagList.fromUsageCounts(await MastoApi.instance.getRecentUserToots());
    }

    // Trending tags across the fediverse, but stripped of any followed or muted tags
    static async fromTrending(): Promise<TagList> {
        const trendingTagList = await MastodonServer.fediverseTrendingTags();
        await trendingTagList.removeFollowedTags();
        return trendingTagList;
    }

    // Alternate constructor, builds Tags with numToots set to the # of times the tag appears in the toots
    static fromUsageCounts(toots: Toot[]): TagList {
        // If the user is mostly a retooter count retweets as toots for the purposes of counting tags
        let retootsPct = toots.length ? (toots.filter(toot => !!toot.reblog).length / toots.length) : 0;
        const isRetooter = (retootsPct > config.participatedTags.minPctToCountRetoots);

        const tagsWithUsageCounts = toots.reduce(
            (tagCounts, toot) => {
                toot = isRetooter ? toot.realToot() : toot;

                toot.tags.forEach((tag) => {
                    const newTag = Object.assign({}, tag) as TagWithUsageCounts;
                    newTag.numToots ??= 0;

                    if (!(tag.name in tagCounts) && (newTag.numToots > 0)) {
                        logger.warn(`<fromUsageCounts()> "${tag.name}" not in tagCounts but numToots is > 0`, tag);
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

    // Return the tag if it exists in 'tags' array, otherwise undefined.
    getTag(tag: string | MastodonTag): TagWithUsageCounts | undefined {
        const name = typeof tag === 'string' ? tag : tag.name;
        return this.tagNames[name.toLowerCase()];
    }

    map<T>(callback: (tag: TagWithUsageCounts) => T): T[] {
        return this.tags.map(callback);
    }

    maxNumAccounts(): number | undefined {
        const tagsNumAccounts = this.tags.map(t => t.numAccounts).filter(n => !isNull(n) && !isNaN(n!));
        return tagsNumAccounts.length ? Math.max(...tagsNumAccounts as number[]) : undefined
    }

    maxNumToots(): number | undefined {
        const tagsNumToots = this.tags.map(t => t.numToots).filter(n => !isNull(n) && !isNaN(n!));
        return tagsNumToots.length ? Math.max(...tagsNumToots as number[]) : undefined
    }

    // Returns a dict of tag names to numToots, which is (for now) what is used by BooleanFilter
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

    // Return numTags tags sorted by numAccounts if it exists, otherwise numToots, then by name
    // If 'numTags' is not set return all tags.
    topTags(numTags?: number): TagWithUsageCounts[] {
        const sortBy = (this.tags.every(t => t.numAccounts) ? "numAccounts" : "numToots");
        const sortByAndName = [sortBy, "name"] as (keyof TagWithUsageCounts)[]
        this.tags = sortObjsByProps(Object.values(this.tags), sortByAndName, [false, true]);
        return numTags ? this.tags.slice(0, numTags) : this.tags;
    }

    // Return a dictionary of tag names to tags
    private tagNameDict(): TagNames {
        return this.tags.reduce((tagNames, tag) => {
            tagNames[tag.name] = tag;
            return tagNames;
        }, {} as TagNames);
    }
};
