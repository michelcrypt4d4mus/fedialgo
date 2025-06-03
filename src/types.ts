/*
 * Typescript type definitions.
 */
import { mastodon } from 'masto';
import { Mutex, MutexInterface, SemaphoreInterface } from 'async-mutex';

import Account from './api/objects/account';
import BooleanFilter, { BooleanFilterArgs, BooleanFilterName } from './filters/boolean_filter';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import Scorer from './scorer/scorer';
import TagList from './api/tag_list';
import Toot, { SerializableToot } from './api/objects/toot';
import { CacheKey, NonScoreWeightName, ScoreName, TagTootsCacheKey, DATA_SOURCES_FOR_FILTER_OPTIONS } from './enums';

// Records
export type AccountNames = Record<mastodon.v1.Account["acct"], Account>;
export type ApiMutex = Record<ApiCacheKey, Mutex>;
export type MastodonInstances = Record<string, MastodonInstance>;
export type NonScoreWeightInfoDict = Record<NonScoreWeightName, WeightInfo>;
export type ObjNames = Record<string, ObjWithTootCount>;
export type StringDict = Record<string, string>;
export type StringNumberDict = Record<string, number>;
export type TagNames = Record<string, TagWithUsageCounts>;
export type Weights = Record<WeightName, number>;
export type WeightInfoDict = Record<WeightName, WeightInfo>;

// Misc
export type AccountLike = Account | mastodon.v1.Account;
export type ApiCacheKey = CacheKey | TagTootsCacheKey;
export type ConcurrencyLockRelease = MutexInterface.Releaser | SemaphoreInterface.Releaser;
export type CountKey = FilterTitle | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterTitle = BooleanFilterName | TootNumberProp;
export type StatusList = TootLike[];
export type StringSet = Set<string | undefined>;
export type TootLike = mastodon.v1.Status | SerializableToot | Toot;
export type TootNumberProp = KeysOfValueType<Toot, number>;


// Filters
export type FilterOptionDataSource = typeof DATA_SOURCES_FOR_FILTER_OPTIONS[number];
export type FilterOptionUserData = {[key in FilterOptionDataSource]?: number};
export interface BooleanFilterOption extends FilterOptionUserData, ObjWithTootCount {};

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

export type ObjListDataSource = (
    FilterTitle
  | CacheKey.FEDIVERSE_TRENDING_TAGS
  | ScoreName.FOLLOWED_TAGS
  | UserDataSource
);

// Abstract interface for objects that have numToots of some kind
export interface ObjWithTootCount extends WithCounts {
    name: string;
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

export interface TagWithUsageCounts extends mastodon.v1.Tag, ObjWithTootCount {
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
export interface TrendingLink extends mastodon.v1.TrendLink, WithCounts {};

// TODO: we can't enforce that keys are TrendingType enum because "toots" is different from "statuses"
export type TrendingData = {
    links: TrendingLink[];
    servers: MastodonInstances;
    tags: TagList;
    toots: Toot[];
};

export type TrendingWithHistory = TagWithUsageCounts | TrendingLink;
export type TrendingObj = TrendingWithHistory | Toot;

// TODO: this is a janky name for what we want, which is a name for a data source that can be used
// in demo app to compute gradient colors.
export type UserDataSource = (
    ScoreName.FAVOURITED_ACCOUNTS
  | TagTootsCacheKey
);

export type WeightedScore = {
    raw: number;
    weighted: number;
};

export type WeightInfo = {
    description: string;
    minValue?: number;
    scorer?: Scorer;
};

// Names of all the user adjustable score weightings, both those with a Scorer and those without
export type WeightName = ScoreName | NonScoreWeightName;

export interface WithCounts {
    numAccounts?: number;
    numToots?: number;
    regex?: RegExp;
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
