/*
 * Special case of ObjWithCountList for lists of Tag objects.
 */
import MastoApi from "./api";
import MastodonServer from "./mastodon_server";
import ObjWithCountList from "./obj_with_counts_list";
import Toot from "./objects/toot";
import UserData from "./user_data";
import { config } from "../config";
import { Logger } from '../helpers/logger';
import { repairTag } from "./objects/tag";
import { ScoreName, TagTootsCacheKey } from "../enums";
import {
    type MastodonTag,
    type ObjWithTootCount,
    type ObjListDataSource,
    type TagNames,
    type TagWithUsageCounts,
} from "../types";

const logger = new Logger("TagList");


export default class TagList extends ObjWithCountList<TagWithUsageCounts> {
    constructor(tags: TagWithUsageCounts[], label: ObjListDataSource) {
        super(tags.map(repairTag), label);
    }

    // Remove elements that don't match the predicate(). Returns a new TagList object
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList {
        return new TagList(this.objs.filter(predicate), this.source);
    }

    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites(): Promise<TagList> {
        return TagList.fromUsageCounts(
            await MastoApi.instance.getFavouritedToots(),
            TagTootsCacheKey.FAVOURITED_TAG_TOOTS
        );
    }

    // Tags the user follows  // TODO: could look for tags in the accounts they follow too
    static async fromFollowedTags(): Promise<TagList> {
        return new TagList(
            await MastoApi.instance.getFollowedTags(),
            ScoreName.FOLLOWED_TAGS
        );
    }

    // Tags the user has posted in
    static async fromParticipated(): Promise<TagList> {
        return TagList.fromUsageCounts(
            await MastoApi.instance.getRecentUserToots(),
            TagTootsCacheKey.FAVOURITED_TAG_TOOTS
        );
    }

    // Trending tags across the fediverse, but stripped of any followed or muted tags
    static async fromTrending(): Promise<TagList> {
        const trendingTagList = await MastodonServer.fediverseTrendingTags();
        await trendingTagList.removeFollowedTags();
        return trendingTagList;
    }

    // Alternate constructor, builds TagWithUsageCounts objects with numToots set to the
    // # of times the tag appears in 'toots'.
    static fromUsageCounts(toots: Toot[], label: ObjListDataSource): TagList {
        // If the user is mostly a retooter count retweets as toots for the purposes of counting tags
        let retootsPct = toots.length ? (toots.filter(toot => !!toot.reblog).length / toots.length) : 0;
        const isRetooter = (retootsPct > config.participatedTags.minPctToCountRetoots);

        const tagsWithUsageCounts = toots.reduce(
            (tagCounts, toot) => {
                toot = isRetooter ? toot.realToot() : toot;

                toot.tags.forEach((tag) => {
                    const newTag = Object.assign({}, tag) as TagWithUsageCounts;
                    newTag.numToots ??= 0;
                    tagCounts[tag.name] ??= newTag;
                    tagCounts[tag.name].numToots! += 1;
                });

                return tagCounts;
            },
            {} as TagNames
        );

        return new this(Object.values(tagsWithUsageCounts), label);
    }

    // Return the tag if it exists in 'tags' array, otherwise undefined.
    getTag(tag: string | MastodonTag): ObjWithTootCount | undefined {
        return this.getObj(typeof tag == "string" ? tag : tag.name);
    }

    // Filter out any tags that are muted or followed
    async removeFollowedAndMutedTags(): Promise<void> {
        await this.removeFollowedTags();
        await this.removeMutedTags();
    }

    // Screen a list of hashtags against the user's followed tags, removing any that are followed.
    async removeFollowedTags(): Promise<void> {
        const followedKeywords = (await MastoApi.instance.getFollowedTags()).map(t => t.name);
        this.removeKeywords(followedKeywords);
    }

    // Remove the configured list of invalid trending tags as well as japanese/korean etc. tags
    removeInvalidTrendingTags(): void {
        this.removeKeywords(config.trending.tags.invalidTags);
        this.objs = this.objs.filter(tag => !tag.language || (tag.language == config.locale.language));
    }

    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags(): Promise<void> {
        this.removeKeywords(await UserData.getMutedKeywords());
    }

    // Return the tag lists used to search for toots (participated/trending/favourited) in their raw unfiltered form
    static async allTagTootsLists(): Promise<Record<TagTootsCacheKey, TagList>> {
        const tagLists = await Promise.all([
            TagList.fromFavourites(),
            TagList.fromParticipated(),
            TagList.fromTrending(),
        ]);

        return {
            [TagTootsCacheKey.FAVOURITED_TAG_TOOTS]: tagLists[0],
            [TagTootsCacheKey.PARTICIPATED_TAG_TOOTS]: tagLists[1],
            [TagTootsCacheKey.TRENDING_TAG_TOOTS]: tagLists[2],
        };
    }
};
