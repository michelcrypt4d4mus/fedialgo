/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
import MastoApi from "../api/api";
import MastodonServer from "../api/mastodon_server";
import TagList from "../api/objects/tag_list";
import Toot from "../api/objects/toot";
import UserData from "../api/user_data";
import { bracketed } from "../helpers/string_helpers";
import { CacheKey, MastodonTag } from "../types";
import { config } from "../config";
import { traceLog } from "../helpers/log_helpers";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";


export async function getFavouritedTagToots(): Promise<Toot[]> {
    const logPrefix = bracketed("getFavouritedHashtagToots()");
    const favouritedTags = await TagList.fromFavourites();
    const followedTags = (await TagList.fromFollowedTags()).tagNameDict();
    const participatedTags = (await TagList.fromParticipated()).tagNameDict();
    console.debug(`${logPrefix} followedTags:`, followedTags);
    console.debug(`${logPrefix} participatedTags:`, participatedTags);

    // Filter out tags that are followed or have high participation by the fedialgo user
    const favouritedNonParticipatedTags = favouritedTags.tags.filter((tag) => {
        let isValid = true;

        if (config.trending.tags.invalidTrendingTags.includes(tag.name)) {
            isValid = false;
        } else if (tag.name in followedTags) {
            isValid = false;
        } else if ((participatedTags[tag.name]?.numToots || 0) >= 2) { // TODO: make this a config value or (better) a heuristic based on the data
            isValid = false;
        }

        // traceLog(`${logPrefix} Check favourited tag: ${tag.name} (isValid=${isValid}, ${tag.numToots} faves)\nfollowedTags entry:`, followedTags[tag.name], "\nparticipatedTags entry:", participatedTags[tag.name]);
        return isValid;
    });

    console.debug(`${logPrefix} ${favouritedNonParticipatedTags.length} of ${favouritedTags.tags.length} favourited tags not followed/participated`);
    const topFavouritedTags = (new TagList(favouritedNonParticipatedTags)).topTags(config.favouritedTags.numTags);

    topFavouritedTags.forEach((tag, i) => {
        traceLog(`${logPrefix} Favourited not followed/participated tag ${i}: ${tag.name} (${tag.numToots} faves)`);
    });

    return await MastoApi.instance.getCacheableToots(
        async () => await MastoApi.instance.getStatusesForTags(topFavouritedTags, config.favouritedTags.numTootsPerTag),
        CacheKey.FAVOURITED_HASHTAG_TOOTS,
        config.favouritedTags.maxToots,
    );
};


// Get recent toots from hashtags the user has participated in frequently
export async function getParticipatedHashtagToots(): Promise<Toot[]> {
    const logPrefix = bracketed("getParticipatedHashtagToots()");
    let tags = await UserData.getUserParticipatedTagsSorted();
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
