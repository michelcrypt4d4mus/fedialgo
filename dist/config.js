"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FILTERS = exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    defaultRecordsPerPage: 40,
    maxTimelineTootsToFetch: 480,
    maxTimelineHoursToFetch: 96,
    reloadIfOlderThanMinutes: 10,
    defaultLanguage: "en",
    // API stuff
    minRecordsForFeatureScoring: 400,
    maxFollowingAccountsToPull: 5000,
    reloadFeaturesEveryNthOpen: 9,
    numServersToCheck: 30,
    minServerMAU: 100,
    // Trending tags
    numDaysToCountTrendingTagData: 3,
    numTrendingTags: 20,
    numTrendingTagsPerServer: 20,
    numTrendingTagsToots: 100,
    numTrendingTagsTootsPerServer: 20,
    // Tag filters
    minTootsForTagToAppearInFilter: 5,
    // Trending toots
    numTrendingTootsPerServer: 30, // NUM_TRENDING_TOOTS_PER_SERVER
};
exports.DEFAULT_FILTERS = {
    filteredApps: [],
    filteredLanguages: [],
    filteredTags: [],
    includeFollowedAccounts: true,
    includeFollowedHashtags: true,
    includeReplies: true,
    includeReposts: true,
    includeTrendingHashTags: true,
    includeTrendingToots: true,
    onlyLinks: false,
    suppressSelectedTags: false,
    weightLearningEnabled: false,
};
// TODO: maybe put default weights here too?
//# sourceMappingURL=config.js.map