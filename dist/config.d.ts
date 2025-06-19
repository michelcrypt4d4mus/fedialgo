import { CacheKey, type ApiCacheKey } from "./enums";
import { type NonScoreWeightInfoDict } from "./types";
export declare const FEDIVERSE_CACHE_KEYS: CacheKey[];
export declare const SECONDS_IN_MINUTE = 60;
export declare const MINUTES_IN_HOUR = 60;
export declare const MINUTES_IN_DAY: number;
export declare const SECONDS_IN_HOUR: number;
export declare const SECONDS_IN_DAY: number;
export declare const SECONDS_IN_WEEK: number;
export declare const MIN_RECORDS_FOR_FEATURE_SCORING = 320;
export declare const MAX_ENDPOINT_RECORDS_TO_PULL = 5000;
type ApiRequestDefaults = {
    allowBackgroundLoad?: boolean;
    initialMaxRecords?: number;
    limit?: number;
    lookbackForUpdatesMinutes?: number;
    maxCacheRecords?: number;
    minutesUntilStale?: number;
    skipCache?: boolean;
    supportsMinMaxId?: boolean;
};
type ApiDataConfig = Record<ApiCacheKey, ApiRequestDefaults>;
interface ApiConfig {
    backgroundLoadIntervalMinutes: number;
    backgroundLoadSleepBetweenRequestsMS: number;
    data: Readonly<ApiDataConfig>;
    daysBeforeFullCacheRefresh: number;
    defaultRecordsPerPage: number;
    errorMsgs: Readonly<Record<string, string>>;
    maxConcurrentHashtagRequests: number;
    maxRecordsForFeatureScoring: number;
    maxSecondsPerPage: number;
    minutesUntilStaleDefault: number;
    mutexWarnSeconds: number;
    timeoutMS: number;
}
type FediverseConfig = {
    defaultServers: string[];
    foreignLanguageServers: Readonly<Record<string, string[]>>;
    minServerMAU: number;
    noMauServers: string[];
    noTrendingLinksServers: string[];
    numServersToCheck: number;
};
type LocaleConfig = {
    country: string;
    defaultLanguage: string;
    language: string;
    locale: string;
    messages: {
        finalizingScores: string;
        isBusy: string;
        initialLoadingStatus: string;
        readyToLoad: string;
    };
};
interface ParticipatedTagsConfig extends TagTootsConfig {
    minPctToCountRetoots: number;
}
type ScoringConfig = {
    excessiveTags: number;
    excessiveTagsPenalty: number;
    nonScoreWeightMinValue: number;
    nonScoreWeightsConfig: Readonly<NonScoreWeightInfoDict>;
    minTrendingTagTootsForPenalty: number;
    scoringBatchSize: number;
    timeDecayExponent: number;
};
export interface TagTootsConfig {
    invalidTags?: string[];
    maxToots: number;
    numTags: number;
    numTootsPerTag: number;
}
type TootsConfig = {
    batchCompleteSize: number;
    batchCompleteSleepBetweenMS: number;
    completeAfterMinutes: number;
    maxAgeInDays: number;
    maxTimelineLength: number;
    minCharsForLanguageDetect: number;
    saveChangesIntervalSeconds: number;
    tagOnlyStrings: Set<string>;
    truncateFullTimelineToLength: number;
};
type TrendingLinksConfig = {
    numTrendingLinksPerServer: number;
};
interface TrendingTagsConfig extends TagTootsConfig {
    numTagsPerServer: number;
}
type TrendingTootsConfig = {
    numTrendingTootsPerServer: number;
};
type TrendingConfig = {
    daysToCountTrendingData: number;
    links: Readonly<TrendingLinksConfig>;
    tags: Readonly<TrendingTagsConfig>;
    toots: Readonly<TrendingTootsConfig>;
};
interface ConfigType {
    api: ApiConfig;
    favouritedTags: Readonly<TagTootsConfig>;
    fediverse: Readonly<FediverseConfig>;
    locale: Readonly<LocaleConfig>;
    participatedTags: Readonly<ParticipatedTagsConfig>;
    scoring: Readonly<ScoringConfig>;
    toots: Readonly<TootsConfig>;
    trending: Readonly<TrendingConfig>;
}
/**
 * Centralized application configuration class for non-user configurable settings.
 *
 * The Config class provides strongly-typed, centralized access to all core settings for API requests,
 * locale, scoring, trending, and fediverse-wide data. It includes logic for environment-specific overrides
 * (debug, quick load, load test), validation of config values, and locale/language management.
 *
 * @class
 * @implements {ConfigType}
 * @property {ApiConfig} api - API request and caching configuration.
 * @property {TagTootsConfig} favouritedTags - Settings for favourited tags and related toot fetching.
 * @property {FediverseConfig} fediverse - Fediverse-wide server and trending configuration.
 * @property {LocaleConfig} locale - Locale, language, and country settings.
 * @property {ParticipatedTagsConfig} participatedTags - Settings for user's participated tags.
 * @property {ScoringConfig} scoring - Scoring and weighting configuration for toots and tags.
 * @property {TootsConfig} toots - Timeline and toot cache configuration.
 * @property {TrendingConfig} trending - Trending data configuration for links, tags, and toots.
 */
declare class Config implements ConfigType {
    api: {
        backgroundLoadSleepBetweenRequestsMS: number;
        backgroundLoadIntervalMinutes: number;
        daysBeforeFullCacheRefresh: number;
        defaultRecordsPerPage: number;
        errorMsgs: {
            accessTokenRevoked: string;
            rateLimitError: string;
            rateLimitWarning: string;
        };
        maxConcurrentHashtagRequests: number;
        maxRecordsForFeatureScoring: number;
        maxSecondsPerPage: number;
        minutesUntilStaleDefault: number;
        mutexWarnSeconds: number;
        timeoutMS: number;
        data: ApiDataConfig;
    };
    favouritedTags: {
        maxParticipations: number;
        maxToots: number;
        numTags: number;
        numTootsPerTag: number;
    };
    fediverse: {
        minServerMAU: number;
        numServersToCheck: number;
        defaultServers: string[];
        foreignLanguageServers: Record<string, string[]>;
        noMauServers: string[];
        noTrendingLinksServers: string[];
    };
    locale: {
        country: string;
        defaultLanguage: string;
        language: string;
        locale: string;
        messages: {
            finalizingScores: string;
            initialLoadingStatus: string;
            isBusy: string;
            readyToLoad: string;
        };
    };
    participatedTags: {
        invalidTags: string[];
        maxToots: number;
        minPctToCountRetoots: number;
        numTags: number;
        numTootsPerTag: number;
    };
    scoring: {
        excessiveTags: number;
        excessiveTagsPenalty: number;
        minTrendingTagTootsForPenalty: number;
        nonScoreWeightMinValue: number;
        nonScoreWeightsConfig: {
            TimeDecay: {
                description: string;
            };
            Trending: {
                description: string;
            };
            OutlierDampener: {
                description: string;
            };
        };
        scoringBatchSize: number;
        timeDecayExponent: number;
    };
    toots: {
        batchCompleteSize: number;
        batchCompleteSleepBetweenMS: number;
        completeAfterMinutes: number;
        maxAgeInDays: number;
        maxContentPreviewChars: number;
        maxTimelineLength: number;
        minCharsForLanguageDetect: number;
        saveChangesIntervalSeconds: number;
        truncateFullTimelineToLength: number;
        tagOnlyStrings: Set<string>;
    };
    trending: {
        daysToCountTrendingData: number;
        links: {
            numTrendingLinksPerServer: number;
        };
        tags: {
            invalidTags: string[];
            maxToots: number;
            numTagsPerServer: number;
            numTags: number;
            numTootsPerTag: number;
        };
        toots: {
            numTrendingTootsPerServer: number;
        };
    };
    /** Construct a new Config instance, validate it, and logs the validated config. */
    constructor();
    /**
     * Computes the minimum value of minutesUntilStale for all FEDIVERSE_CACHE_KEYS.
     * Warns if any required keys are missing a value.
     * @returns {number} The minimum minutes until trending data is considered stale, or 60 if not all keys are configured.
     */
    minTrendingMinutesUntilStale(): number;
    /**
     * Sets the locale, language, and country for the application if supported.
     * Falls back to defaults if the locale is invalid or unsupported.
     * @param {string} [locale] - The locale string (e.g., "en-CA").
     */
    setLocale(locale?: string): void;
    /**
     * Validates config values for correctness (e.g., checks for NaN or empty strings).
     * Throws an error if invalid values are found.
     * @private
     * @param {ConfigType | object} [cfg] - The config object or sub-object to validate.
     */
    private validate;
}
declare const config: Config;
export { config };
