/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
import MastoApi from "../api/api";
import MastodonServer from "../api/mastodon_server";
import Toot from "../api/objects/toot";
import UserData from "../api/user_data";
import { StorageKey } from "../types";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";


// Get recent toots from hashtags the user has participated in frequently
export async function getParticipatedHashtagToots(): Promise<Toot[]> {
    return await MastoApi.instance.getCacheableToots(
        StorageKey.PARTICIPATED_TAG_TOOTS,
        async () => {
            let tags = await UserData.getPostedHashtagsSorted();
            // Exclude followed tags from the list (they will show up in the timeline on their own)
            const followedTags = await MastoApi.instance.getFollowedTags();
            tags = tags.filter(t => !followedTags.some(f => f.name == t.name));
            tags = truncateToConfiguredLength(tags, "numParticipatedTagsToFetchTootsFor");
            console.debug(`[getParticipatedHashtagToots] Fetching toots for tags:`, tags);
            return await MastoApi.instance.getStatusesForTags(tags);
        },
        "numParticipatedTagToots"
    );
}


// Get toots for the top trending tags via the search endpoint.
export async function getRecentTootsForTrendingTags(): Promise<Toot[]> {
    return await MastoApi.instance.getCacheableToots(
        StorageKey.TRENDING_TAG_TOOTS,
        async () => MastoApi.instance.getStatusesForTags(await MastodonServer.fediverseTrendingTags()),
        "numTrendingTagsToots"
    );
};
