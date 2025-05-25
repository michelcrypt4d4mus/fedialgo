/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
import MastoApi from "../api/api";
import MastodonServer from "../api/mastodon_server";
import Toot from "../api/objects/toot";
import UserData from "../api/user_data";
import { bracketed } from "../helpers/string_helpers";
import { config } from "../config";
import { MastodonTag, CacheKey } from "../types";
import { traceLog } from "../helpers/log_helpers";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";


// Get recent toots from hashtags the user has participated in frequently
export async function getParticipatedHashtagToots(): Promise<Toot[]> {
    const logPrefix = bracketed("getParticipatedHashtagToots()");
    let tags = await UserData.getUserParticipatedHashtagsSorted();
    tags = await removeFollowedAndMutedTags(tags);
    // Remove trending tags from the list of participated tags (we get them anyways)
    tags = removeKeywordsFromTags(tags, (await getTrendingTags()).map(t => t.name), logPrefix);
    tags = truncateToConfiguredLength(tags, config.participatedTags.numTags, logPrefix);
    console.debug(`${logPrefix} Gettings toots for participated tags:`, tags);

    return await MastoApi.instance.getCacheableToots(
        async () => await MastoApi.instance.getStatusesForTags(tags, config.participatedTags.numTootsPerTag),
        CacheKey.PARTICIPATED_TAG_TOOTS,
        config.participatedTags.maxToots,
    );
};


// Get toots for the top trending tags via the search endpoint.
export async function getRecentTootsForTrendingTags(): Promise<Toot[]> {
    let tags = await getTrendingTags();

    return await MastoApi.instance.getCacheableToots(
        async () => await MastoApi.instance.getStatusesForTags(tags, config.trending.tags.numTootsPerTag),
        CacheKey.TRENDING_TAG_TOOTS,
        config.trending.tags.maxToots,
    );
};


// Screen a list of hashtags against the user's server side filters, removing any that are muted.
export async function removeMutedTags(tags: MastodonTag[]): Promise<MastodonTag[]> {
    const mutedKeywords = await UserData.getMutedKeywords();
    return removeKeywordsFromTags(tags, mutedKeywords, "[removeMutedTags()]");
};


// Get the trending tags across the fediverse
// TODO: stripping out followed/muted tags here can result in less than Config.trending.tags.numTags tags
async function getTrendingTags(): Promise<MastodonTag[]> {
    const tags = await MastodonServer.fediverseTrendingTags();
    return await removeFollowedAndMutedTags(tags);
};


// Filter out any tags that are muted or followed
async function removeFollowedAndMutedTags(tags: MastodonTag[]): Promise<MastodonTag[]> {
    return await removeFollowedTags(await removeMutedTags(tags));
};


// Screen a list of hashtags against the user's followed tags, removing any that are followed.
async function removeFollowedTags(tags: MastodonTag[]): Promise<MastodonTag[]> {
    const followedKeywords = (await MastoApi.instance.getFollowedTags()).map(t => t.name);
    return removeKeywordsFromTags(tags, followedKeywords, "[removeFollowedTags()]");
};


function removeKeywordsFromTags(tags: MastodonTag[], keywords: string[], logPrefix: string): MastodonTag[] {
    keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
    const validTags = tags.filter(tag => !keywords.includes(tag.name));

    if (validTags.length != tags.length) {
        traceLog(`${logPrefix} Filtered out ${tags.length - validTags.length} tags:`, tags);
    }

    return validTags;
};
