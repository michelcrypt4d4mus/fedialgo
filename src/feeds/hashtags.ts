/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
import MastoApi from "../api/api";
import MastodonServer from "../api/mastodon_server";
import Toot from "../api/objects/toot";
import UserData from "../api/user_data";
import { Config } from "../config";
import { MastodonTag, StorageKey } from "../types";
import { traceLog } from "../helpers/log_helpers";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";


// Get recent toots from hashtags the user has participated in frequently
export async function getParticipatedHashtagToots(): Promise<Toot[]> {
    let tags = await UserData.getUserParticipatedHashtagsSorted();
    tags = await removeFollowedAndMutedTags(tags);
    tags = truncateToConfiguredLength(tags, "numParticipatedTagsToFetchTootsFor");
    console.debug("[getParticipatedHashtagToots()] Gettings toots for participated tags:", tags);

    return await MastoApi.instance.getCacheableToots(
        StorageKey.PARTICIPATED_TAG_TOOTS,
        async () => await MastoApi.instance.getStatusesForTags(tags, Config.numParticipatedTagTootsPerTag),
        "numParticipatedTagToots"
    );
};


// Get toots for the top trending tags via the search endpoint.
export async function getRecentTootsForTrendingTags(): Promise<Toot[]> {
    let tags = await MastodonServer.fediverseTrendingTags();
    // TODO: stripping out followed/muted tags here can result in less than Config.numTrendingTags tags
    tags = await removeFollowedAndMutedTags(tags);

    return await MastoApi.instance.getCacheableToots(
        StorageKey.TRENDING_TAG_TOOTS,
        async () => await MastoApi.instance.getStatusesForTags(tags, Config.numTootsPerTrendingTag),
        "numTrendingTagsToots"
    );
};


// Filter out any tags that are muted or followed
async function removeFollowedAndMutedTags(tags: MastodonTag[]): Promise<MastodonTag[]> {
    return await removeFollowedTags(await removeMutedTags(tags));
};


// Screen a list of hashtags against the user's server side filters, removing any that are muted.
async function removeMutedTags(tags: MastodonTag[]): Promise<MastodonTag[]> {
    const mutedKeywords = await UserData.mutedKeywords();
    return removeKeywordsFromTags(tags, mutedKeywords, "[removeMutedTags()]");
};


// Screen a list of hashtags against the user's followed tags, removing any that are followed.
async function removeFollowedTags(tags: MastodonTag[]): Promise<MastodonTag[]> {
    const followedKeywords = (await MastoApi.instance.getFollowedTags()).map(t => t.name);
    return removeKeywordsFromTags(tags, followedKeywords, "[removeFollowedTags()]");
};


function removeKeywordsFromTags(tags: MastodonTag[], keywords: string[], logPrefix: string): MastodonTag[] {
    const validTags = tags.filter(tag => !keywords.includes(tag.name));

    if (validTags.length != tags.length) {
        traceLog(`${logPrefix} Filtered out ${tags.length - validTags.length} tags:`, tags);
    }

    return validTags;
};
