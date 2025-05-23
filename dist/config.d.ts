import { NonScoreWeightInfoDict, CacheKey } from "./types";
export declare const SECONDS_IN_MINUTE = 60;
export declare const MINUTES_IN_HOUR = 60;
export declare const MINUTES_IN_DAY: number;
export declare const SECONDS_IN_HOUR: number;
export declare const SECONDS_IN_DAY: number;
export declare const SECONDS_IN_WEEK: number;
export declare const MIN_RECORDS_FOR_FEATURE_SCORING = 320;
export declare const MAX_ENDPOINT_RECORDS_TO_PULL = 5000;
type ApiRequestDefaults = {
    initialMaxRecords?: number;
    limit?: number;
    lookbackForUpdatesMinutes?: number;
    minutesUntilStale?: number;
    supportsMinMaxId?: boolean;
};
type ApiDataConfig = {
    [key in CacheKey]?: ApiRequestDefaults;
};
interface ApiConfig {
    backgroundLoadIntervalMinutes: number;
    data: ApiDataConfig;
    defaultRecordsPerPage: number;
    hashtagTootRetrievalDelaySeconds: number;
    maxConcurrentRequestsBackground: number;
    maxConcurrentRequestsInitial: number;
    maxRecordsForFeatureScoring: number;
    minutesUntilStaleDefault: number;
    mutexWarnSeconds: number;
    timeoutMS: number;
}
type FediverseConfig = {
    defaultServers: string[];
    foreignLanguageServers: Record<string, string[]>;
    minServerMAU: number;
    noMauServers: string[];
    noTrendingLinksServers: string[];
    numServersToCheck: number;
};
type GuiConfig = {
    isAppFilterVisible: boolean;
};
type LocaleConfig = {
    country: string;
    defaultLanguage: string;
    language: string;
    locale: string;
};
type ScoringConfig = {
    excessiveTags: number;
    excessiveTagsPenalty: number;
    nonScoreWeightMinValue: number;
    nonScoreWeightsConfig: NonScoreWeightInfoDict;
    minTrendingTagTootsForPenalty: number;
    scoringBatchSize: number;
    timeDecayExponent: number;
};
interface TagTootsConfig {
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
};
type TrendingLinksConfig = {
    numTrendingLinksPerServer: number;
};
interface TrendingTagsConfig extends TagTootsConfig {
    invalidTrendingTags: string[];
    numTagsPerServer: number;
}
type TrendingTootsConfig = {
    numTrendingTootsPerServer: number;
};
type TrendingConfig = {
    daysToCountTrendingData: number;
    links: TrendingLinksConfig;
    tags: TrendingTagsConfig;
    toots: TrendingTootsConfig;
};
interface ConfigType {
    api: ApiConfig;
    fediverse: FediverseConfig;
    gui: GuiConfig;
    locale: LocaleConfig;
    participatedTags: TagTootsConfig;
    scoring: ScoringConfig;
    toots: TootsConfig;
    trending: TrendingConfig;
}
declare class Config implements ConfigType {
    api: {
        backgroundLoadIntervalMinutes: number;
        defaultRecordsPerPage: number;
        hashtagTootRetrievalDelaySeconds: number;
        maxConcurrentRequestsInitial: number;
        maxConcurrentRequestsBackground: number;
        maxRecordsForFeatureScoring: number;
        minutesUntilStaleDefault: number;
        mutexWarnSeconds: number;
        timeoutMS: number;
        data: ApiDataConfig;
    };
    fediverse: {
        minServerMAU: number;
        numServersToCheck: number;
        defaultServers: string[];
        foreignLanguageServers: Record<string, string[]>;
        noMauServers: string[];
        noTrendingLinksServers: string[];
    };
    gui: {
        isAppFilterVisible: boolean;
    };
    locale: {
        country: string;
        defaultLanguage: string;
        language: string;
        locale: string;
    };
    participatedTags: {
        maxToots: number;
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
    };
    trending: {
        daysToCountTrendingData: number;
        links: {
            numTrendingLinksPerServer: number;
        };
        tags: {
            invalidTrendingTags: string[];
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
