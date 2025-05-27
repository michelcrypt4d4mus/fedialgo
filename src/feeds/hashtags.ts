/*
 * Methods used to fetch toots for the timeline based on hashtags
 */
import MastoApi from "../api/api";
import MastodonServer from "../api/mastodon_server";
import TagList from "../api/objects/tag_list";
import Toot from "../api/objects/toot";
import UserData from "../api/user_data";
import { bracketed } from "../helpers/string_helpers";
import { CacheKey, MastodonTag, TagWithUsageCounts } from "../types";
import { config, TagTootsConfig } from "../config";
import { traceLog } from "../helpers/log_helpers";
import { truncateToConfiguredLength } from "../helpers/collection_helpers";


// Get toots for hashtags the user has favourited a lot
export async function getFavouritedTagToots(): Promise<Toot[]> {
    const logPrefix = bracketed(CacheKey.FAVOURITED_HASHTAG_TOOTS);
    const favouritedTags = await TagList.fromFavourites();
    const participatedTags = (await TagList.fromParticipated()).tagNameDict();

    // Filter out tags that are already followed or have high participation by the fedialgo user
    let tags = favouritedTags.tags.filter((tag) => {
        if (config.trending.tags.invalidTrendingTags.includes(tag.name)) {
            return false;
        } else if ((participatedTags[tag.name]?.numToots || 0) >= 2) { // TODO: make this a config value or (better) a heuristic based on the data
            return false;
        } else {
            return true;
        }
    });

    tags = (new TagList(tags)).topTags(config.favouritedTags.numTags);
    traceLog(`${logPrefix} Using tags:\n   ` + tags.map(tag => `${tag.name} (${tag.numToots} faves)`).join("\n   "));
    return await getCacheableTootsForTags(tags, CacheKey.FAVOURITED_HASHTAG_TOOTS, config.favouritedTags);
};


// Get recent toots from hashtags the user has participated in frequently
export async function getParticipatedHashtagToots(): Promise<Toot[]> {
    const logPrefix = bracketed(CacheKey.PARTICIPATED_TAG_TOOTS);
    const tagList = await TagList.fromParticipated();
    const tags = tagList.topTags();
    console.debug(`${logPrefix} Gettings toots for participated tags:`, tags);
    return await getCacheableTootsForTags(tags, CacheKey.PARTICIPATED_TAG_TOOTS, config.participatedTags);
};


// Get toots for the top trending tags via the search endpoint.
export async function getRecentTootsForTrendingTags(): Promise<Toot[]> {
    const tagList = await TagList.fromTrending();
    return await getCacheableTootsForTags(tagList.topTags(), CacheKey.TRENDING_TAG_TOOTS, config.trending.tags);
};


// Get toots for a list of tags, caching the results
async function getCacheableTootsForTags(tags: TagWithUsageCounts[], cacheKey: CacheKey, cfg: TagTootsConfig): Promise<Toot[]> {
    return await MastoApi.instance.getCacheableToots(
        async () => await MastoApi.instance.getStatusesForTags(tags, cfg.numTootsPerTag),
        cacheKey,
        cfg.maxToots,
    );
}


// Remove tags that match any of the keywords
function removeKeywordsFromTags(tags: MastodonTag[], keywords: string[], logPrefix: string): MastodonTag[] {
    keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
    const validTags = tags.filter(tag => !keywords.includes(tag.name));

    if (validTags.length != tags.length) {
        traceLog(`${logPrefix} Filtered out ${tags.length - validTags.length} tags:`, tags);
    }

    return validTags;
};
