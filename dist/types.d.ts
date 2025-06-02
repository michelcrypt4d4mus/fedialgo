import { mastodon } from 'masto';
import { Mutex, MutexInterface, SemaphoreInterface } from 'async-mutex';
import Account from './api/objects/account';
import BooleanFilter, { BooleanFilterArgs, BooleanFilterName } from './filters/boolean_filter';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import Scorer from './scorer/scorer';
import TagList from './api/tag_list';
import Toot, { SerializableToot } from './api/objects/toot';
import { CacheKey, NonScoreWeightName, ScoreName, TagTootsCacheKey } from './enums';
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
export type BooleanFilters = Record<BooleanFilterName, BooleanFilter>;
export type NumericFilters = Record<TootNumberProp, NumericFilter>;
export type FeedFilterSettingsSerialized = {
    booleanFilterArgs: BooleanFilterArgs[];
    numericFilterArgs: NumericFilterArgs[];
};
export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    booleanFilters: BooleanFilters;
    numericFilters: NumericFilters;
}
export type FilterArgs = {
    title: FilterTitle;
    description?: string;
    invertSelection?: boolean;
    visible?: boolean;
};
export type KeysOfValueType<T, SuperClass> = Exclude<{
    [K in keyof T]: T[K] extends SuperClass ? K : never;
}[keyof T], undefined>;
export type MastodonApiObject = (MastodonObjWithID | mastodon.v1.Tag | mastodon.v1.TrendLink);
export type MastodonObjWithID = (Account | TootLike | mastodon.v1.Account | mastodon.v1.Notification | mastodon.v1.Status | mastodon.v2.Filter);
export interface MastodonInstance extends mastodon.v2.Instance {
    followedPctOfMAU?: number;
    MAU?: number;
}
export type MastodonTag = mastodon.v1.Tag | TagWithUsageCounts;
export interface MinMax {
    min: number;
    max: number;
}
export interface MinMaxAvgScore extends MinMax {
    average: number;
    count: number;
    averageFinalScore: number;
}
export type MinMaxID = {
    min: string;
    max: string;
};
export type ObjListDataSource = (BooleanFilterName | CacheKey.FEDIVERSE_TRENDING_TAGS | ScoreName.FOLLOWED_TAGS | UserDataSource);
export type UserDataSource = (ScoreName.FAVOURITED_ACCOUNTS | TagTootsCacheKey);
export interface ObjWithTootCount extends WithCounts {
    name: string;
}
export type NamedObjWithTootCount = ObjWithTootCount | TagWithUsageCounts;
export type ScoreStats = {
    raw: MinMaxAvgScore[];
    weighted: MinMaxAvgScore[];
};
export type ScoresStats = Record<ScoreName, ScoreStats>;
export type StorableApiObject = (MastodonObjWithID | MastodonTag | TrendingLink);
export type StorableObj = (FeedFilterSettingsSerialized | MastodonInstances | StorableApiObject | StorableApiObject[] | StringNumberDict | Weights | number);
export type StorableObjWithCache = (MastodonInstances | StorableApiObject[]);
export type StorableWithTimestamp = {
    updatedAt: string;
    value: StorableObj;
};
export interface TagWithUsageCounts extends mastodon.v1.Tag, WithCounts {
    language?: string;
}
export type TootContext = {
    ancestors: Toot[];
    descendants: Toot[];
    toot: Toot;
};
export type TootScore = {
    rawScore: number;
    score: number;
    scores: TootScores;
    timeDecayMultiplier: number;
    trendingMultiplier: number;
    weightedScore: number;
};
export type TootScores = Record<ScoreName, WeightedScore>;
export interface TrendingLink extends mastodon.v1.TrendLink, WithCounts {
}
export type TrendingData = {
    links: TrendingLink[];
    servers: MastodonInstances;
    tags: TagList;
    toots: Toot[];
};
export type TrendingWithHistory = TagWithUsageCounts | TrendingLink;
export type TrendingObj = TrendingWithHistory | Toot;
export type WeightedScore = {
    raw: number;
    weighted: number;
};
export type WeightInfo = {
    description: string;
    minValue?: number;
    scorer?: Scorer;
};
export type WeightName = ScoreName | NonScoreWeightName;
export interface WithCounts {
    numAccounts?: number;
    numToots?: number;
    regex?: RegExp;
}
