import { StorageKey, WeightInfoDict } from "./types";
export declare const SECONDS_IN_MINUTE = 60;
export declare const MINUTES_IN_HOUR = 60;
export declare const SECONDS_IN_HOUR: number;
export declare const SECONDS_IN_DAY: number;
export declare const SECONDS_IN_WEEK: number;
export declare const MIN_RECORDS_FOR_FEATURE_SCORING = 320;
export declare const MAX_ENDPOINT_RECORDS_TO_PULL = 5000;
type ApiRequestDefaults = {
    initialMaxRecords?: number;
    limit?: number;
    lookbackForUpdatesMinutes?: number;
    numMinutesUntilStale?: number;
    supportsMinMaxId?: boolean;
};
type ApiConfigBase = {
    [key in StorageKey]?: ApiRequestDefaults;
};
interface ApiConfig extends ApiConfigBase {
    backgroundLoadIntervalSeconds: number;
    defaultRecordsPerPage: number;
    hashtagTootRetrievalDelaySeconds: number;
    maxConcurrentRequestsBackground: number;
    maxConcurrentRequestsInitial: number;
    maxRecordsForFeatureScoring: number;
    mutexWarnSeconds: number;
    staleDataDefaultMinutes: number;
    staleDataTrendingMinutes: number;
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
    minTrendingTagTootsForPenalty: number;
    scoringBatchSize: number;
    timelineDecayExponent: number;
    weightsConfig: WeightInfoDict;
};
interface TagTootsConfig {
    maxToots: number;
    numTags: number;
    numTootsPerTag: number;
}
type TootsConfig = {
    batchCompleteTootsSleepBetweenMS: number;
    batchCompleteTootsSize: number;
    maxAgeInDays: number;
    maxCachedTimelineToots: number;
    saveChangesIntervalSeconds: number;
    tootsCompleteAfterMinutes: number;
};
type TrendingLinksConfig = {
    numTrendingLinksPerServer: number;
};
interface TrendingTagsConfig extends TagTootsConfig {
    invalidTrendingTags: string[];
    numDaysToCountTrendingTagData: number;
    numTagsPerServer: number;
}
type TrendingTootsConfig = {
    numTrendingTootsPerServer: number;
};
type TrendingConfig = {
    links: TrendingLinksConfig;
    tags: TrendingTagsConfig;
    toots: TrendingTootsConfig;
};
export type ConfigType = {
    api: ApiConfig;
    fediverse: FediverseConfig;
    gui: GuiConfig;
    locale: LocaleConfig;
    participatedTags: TagTootsConfig;
    scoring: ScoringConfig;
    toots: TootsConfig;
    trending: TrendingConfig;
};
export declare const Config: ConfigType;
export declare function setLocale(locale?: string): void;
export {};
