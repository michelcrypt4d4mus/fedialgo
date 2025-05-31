/*
 * Typescript type definitions.
 */
import { mastodon } from 'masto';
import { Mutex } from 'async-mutex';

import Account from './api/objects/account';
import BooleanFilter, { BooleanFilterArgs, BooleanFilterName } from './filters/boolean_filter';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import Scorer, { WeightName } from './scorer/scorer';
import { NonScoreWeightName, ScoreName } from './enums';
import Toot, { SerializableToot } from './api/objects/toot';
import { CacheKey } from "./enums";

// Records
export type AccountNames = Record<mastodon.v1.Account["acct"], Account>;
export type ApiMutex = Record<CacheKey, Mutex>;
export type MastodonInstances = Record<string, MastodonInstance>;
export type NonScoreWeightInfoDict = Record<NonScoreWeightName, WeightInfo>;
export type StringDict = Record<string, string>;
export type StringNumberDict = Record<string, number>;
export type TagNames = Record<string, TagWithUsageCounts>;
export type Weights = Record<WeightName, number>;
export type WeightInfoDict = Record<WeightName, WeightInfo>;

// Misc
export type AccountLike = Account | mastodon.v1.Account;
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = BooleanFilterName | TootNumberProp;
export type StatusList = TootLike[];
export type StringSet = Set<string | undefined>;
export type TootLike = mastodon.v1.Status | SerializableToot | Toot;
export type TootNumberProp = KeysOfValueType<Toot, number>;


// Filters
export type BooleanFilters = Record<BooleanFilterName, BooleanFilter>;
export type NumericFilters = Record<TootNumberProp, NumericFilter>;

export type FeedFilterSettingsSerialized = {
    booleanFilterArgs: BooleanFilterArgs[];
    numericFilterArgs: NumericFilterArgs[];
};

// Same as FeedFilterSettingsSerialized but with the filter objects as well as the args needed to construct them
export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    booleanFilters: BooleanFilters;
    numericFilters: NumericFilters;
};

export type FilterArgs = {
    title: FilterTitle;
    description?: string;
    invertSelection?: boolean;
    visible?: boolean;
};


// Extract the keys of T that are of a type that's a subclass of TypeCondition
// https://www.totaltypescript.com/get-keys-of-an-object-where-values-are-of-a-given-type
export type KeysOfValueType<T, SuperClass> = Exclude<
    {[K in keyof T]: T[K] extends SuperClass ? K : never}[keyof T],
    undefined
>;

export type MastodonApiObject = (
    MastodonObjWithID |
    mastodon.v1.Tag |
    mastodon.v1.TrendLink
);

// All these types have an id property
export type MastodonObjWithID = (
    Account |
    TootLike |
    mastodon.v1.Account |
    mastodon.v1.Notification |
    mastodon.v1.Status |
    mastodon.v2.Filter
);

export interface MastodonInstance extends mastodon.v2.Instance {
    followedPctOfMAU?: number;
    MAU?: number;  // MAU data is buried in the Instance hierarchy so this just a copy on the top level
};

export type MastodonTag = mastodon.v1.Tag | TagWithUsageCounts;

export interface MinMax {
    min: number;
    max: number;
};

export interface MinMaxAvgScore extends MinMax {
    average: number;
    count: number;
    averageFinalScore: number;
};

export type MinMaxID = {
    min: string;
    max: string;
};

export type ScoreStats = {
    raw: MinMaxAvgScore[];
    weighted: MinMaxAvgScore[];
};

export type ScoresStats = Record<ScoreName, ScoreStats>;

export type StorableApiObject = (
    MastodonObjWithID |
    MastodonTag |
    TrendingLink
);

// Types that are valid for browser local storage
export type StorableObj = (
    FeedFilterSettingsSerialized |
    MastodonInstances |
    StorableApiObject |
    StorableApiObject[] |
    StringNumberDict |
    Weights |
    number
);

export type StorableObjWithCache = (
    MastodonInstances |
    StorableApiObject[]
);

export type StorableWithTimestamp = {
    updatedAt: string;
    value: StorableObj;
};

export interface TagWithUsageCounts extends mastodon.v1.Tag, TrendingHistory {
    language?: string;
};

// Similar to mastodon.v1.Context: https://docs.joinmastodon.org/entities/Context/
export type TootContext = {
    ancestors: Toot[];
    descendants: Toot[];
    toot: Toot;
};

export type TootScore = {
    rawScore: number;             // Raw score without time decay etc. applied
    score: number;                // Actual final score
    scores: TootScores;           // All the scores for this toot
    timeDecayMultiplier: number;  // Multiplier that reduces the score of older posts
    trendingMultiplier: number;   // Multiplier applied to trending toots and tags
    weightedScore: number;        // Score before applying timeDecayMultiplier
};

export type TootScores = Record<ScoreName, WeightedScore>;
export interface TrendingLink extends mastodon.v1.TrendLink, TrendingHistory {};

// TODO: we can't enforce that keys are TrendingType enum because "toots" is different from "statuses"
export type TrendingData = {
    links: TrendingLink[];
    servers: MastodonInstances;
    tags: TagWithUsageCounts[];
    toots: Toot[];
};

export type TrendingWithHistory = TagWithUsageCounts | TrendingLink;
export type TrendingObj = TrendingWithHistory | Toot;

export interface TrendingHistory {
    numAccounts?: number;
    numToots?: number;
    regex?: RegExp;
};

export type WeightedScore = {
    raw: number;
    weighted: number;
};

export type WeightInfo = {
    description: string;
    minValue?: number;
    scorer?: Scorer;
};


// TODO: unused stuff below here
// From https://dev.to/nikosanif/create-promises-with-timeout-error-in-typescript-fmm
function promiseWithTimeout<T>(
    promise: Promise<T>,
    milliseconds: number,
    timeoutError = new Error('Promise timed out')
): Promise<T> {
    // create a promise that rejects in milliseconds
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(timeoutError);
        }, milliseconds);
    });

    // returns a race between timeout and the passed promise
    return Promise.race<T>([promise, timeout]);
};
