/*
 * Special case of ObjWithCountList for lists of Tag objects.
 */
import MastoApi from "./api";
import ObjWithCountList, { ListSource } from "./obj_with_counts_list";
import Toot from "./objects/toot";
import UserData from "./user_data";
import { config } from "../config";
import { Logger } from '../helpers/logger';
import { repairTag } from "./objects/tag";
import { ScoreName, TagTootsCacheKey } from "../enums";
import {
    type MastodonTag,
    type NamedTootCount,
    type ObjListDataSource,
    type TagWithUsageCounts,
} from "../types";

const logger = new Logger("TagList");


/**
 * Subclass of ObjWithCountList for lists of TagWithUsageCounts objects.
 * @extends {ObjWithCountList}
 */
export default class TagList extends ObjWithCountList<TagWithUsageCounts> {
    constructor(tags: TagWithUsageCounts[], label: ListSource) {
        super(tags.map(repairTag), label);
    }

    // Alternate constructor to build tags where numToots is set to the # of times user favourited that tag
    static async fromFavourites(): Promise<TagList> {
        return TagList.fromUsageCounts(
            await MastoApi.instance.getFavouritedToots(),
            TagTootsCacheKey.FAVOURITED_TAG_TOOTS
        );
    }

    // Alternate constructor for tags the user follows
    static async fromFollowedTags(tags?: TagWithUsageCounts[]): Promise<TagList> {
        tags ||= await MastoApi.instance.getFollowedTags();
        return new TagList(tags, ScoreName.FOLLOWED_TAGS);
    }

    // Alternate constructor for tags the user has posted in
    static async fromParticipated(): Promise<TagList> {
        return TagList.fromUsageCounts(
            await MastoApi.instance.getRecentUserToots(),
            TagTootsCacheKey.PARTICIPATED_TAG_TOOTS
        );
    }

    // Remove elements that don't match the predicate(). Returns a new TagList object.
    // Really only exists because typescript is weird about alternate constructors with generics.
    filter(predicate: (tag: TagWithUsageCounts) => boolean): TagList {
        return new TagList(this.objs.filter(predicate), this.source);
    }

    // Alternate constructor, builds TagWithUsageCounts objects with numToots set to the
    // # of times the tag appears in the 'toots' array of Toot objects.
    static fromUsageCounts(toots: Toot[], source: ObjListDataSource): TagList {
        // If the user is mostly a retooter count retweets as toots for the purposes of counting tags
        let retootsPct = toots.length ? (toots.filter(toot => !!toot.reblog).length / toots.length) : 0;
        const isRetooter = (retootsPct > config.participatedTags.minPctToCountRetoots);
        toots = isRetooter ? toots.map(toot => toot.realToot) : toots;

        const tagList = new TagList([], source);
        const tags = toots.flatMap(toot => toot.tags);
        tagList.populateByCountingProps(tags, (tag) => tag);
        return tagList;
    }

    // Return the tag if it exists in 'tags' array, otherwise undefined.
    getTag(tag: string | MastodonTag): NamedTootCount | undefined {
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
};
