import { CacheKey } from "./enums";
import { ApiCacheKey, type NonScoreWeightInfoDict } from "./types";
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
    data: Readonly<ApiDataConfig>;
    defaultRecordsPerPage: number;
    hashtagTootRetrievalDelaySeconds: number;
    maxConcurrentHashtagRequests: number;
    maxRecordsForFeatureScoring: number;
    maxSecondsPerPage: number;
    minutesUntilStaleDefault: number;
    mutexWarnSeconds: number;
    pullFollowers: boolean;
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
    saveChangesIntervalSeconds: number;
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
declare class Config implements ConfigType {
    api: {
        backgroundLoadIntervalMinutes: number;
        defaultRecordsPerPage: number;
        hashtagTootRetrievalDelaySeconds: number;
        maxConcurrentHashtagRequests: number;
        maxRecordsForFeatureScoring: number;
        maxSecondsPerPage: number;
        minutesUntilStaleDefault: number;
        mutexWarnSeconds: number;
        pullFollowers: boolean;
        timeoutMS: number;
        data: ApiDataConfig;
    };
    favouritedTags: {
        maxToots: number;
        numTags: number;
        numTootsPerTag: number;
        maxParticipations: number;
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
        maxTimelineLength: number;
        saveChangesIntervalSeconds: number;
        truncateFullTimelineToLength: number;
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
    constructor();
    minTrendingMinutesUntilStale(): number;
    setLocale(locale?: string): void;
    private validate;
}
declare const config: Config;
export { config };
