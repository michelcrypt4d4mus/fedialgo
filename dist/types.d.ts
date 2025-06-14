import { mastodon } from 'masto';
import { MutexInterface, SemaphoreInterface } from 'async-mutex';
import Account from './api/objects/account';
import BooleanFilter, { BooleanFilterArgs } from './filters/boolean_filter';
import NumericFilter, { NumericFilterArgs } from './filters/numeric_filter';
import Scorer from './scorer/scorer';
import TagList from './api/tag_list';
import Toot, { SerializableToot } from './api/objects/toot';
import { BooleanFilterName, CacheKey, NonScoreWeightName, ScoreName, TagTootsCacheKey, TOOT_SOURCES } from './enums';
export type AccountNames = Record<mastodon.v1.Account["acct"], Account>;
export type MastodonInstances = Record<string, MastodonInstance>;
export type NonScoreWeightInfoDict = Record<NonScoreWeightName, WeightInfo>;
export type ObjNames = Record<string, NamedTootCount>;
export type PromiseDict = Record<string, Promise<unknown>>;
export type StringDict = Record<string, string>;
export type StringNumberDict = Record<string, number>;
export type TagNames = Record<string, TagWithUsageCounts>;
export type Weights = Record<WeightName, number>;
export type WeightInfoDict = Record<WeightName, WeightInfo>;
export type AccountLike = Account | mastodon.v1.Account;
export type ConcurrencyLockRelease = MutexInterface.Releaser | SemaphoreInterface.Releaser;
export type CountKey = FilterProperty | string;
export type FeedFetcher = (api: mastodon.rest.Client) => Promise<Toot[]>;
export type FilterProperty = BooleanFilterName | TootNumberProp;
export type OptionalNumber = number | null | undefined;
export type OptionalString = string | null | undefined;
export type StringSet = Set<string | undefined>;
export type TootLike = mastodon.v1.Status | SerializableToot | Toot;
export type TootNumberProp = KeysOfValueType<Toot, number>;
export type TootSource = (typeof TOOT_SOURCES)[number];
export declare const FILTER_OPTION_DATA_SOURCES: readonly [...TagTootsCacheKey[], BooleanFilterName.LANGUAGE, ScoreName.FAVOURITED_ACCOUNTS];
export type FilterOptionDataSource = (typeof FILTER_OPTION_DATA_SOURCES)[number];
export type BooleanFilters = Record<BooleanFilterName, BooleanFilter>;
export type NumericFilters = Record<TootNumberProp, NumericFilter>;
type FilterOptionUserData = {
    [key in FilterOptionDataSource]?: number;
};
export interface BooleanFilterOption extends FilterOptionUserData, NamedTootCount {
    isFollowed?: boolean;
}
export type FeedFilterSettingsSerialized = {
    booleanFilterArgs: BooleanFilterArgs[];
    numericFilterArgs: NumericFilterArgs[];
};
/**
 * Represents the full set of filter settings for a feed, including both the serialized filter arguments
 * and the instantiated filter objects themselves. This is used to store and manage the current state
 * of all boolean and numeric filters applied to a feed, as well as the arguments needed to reconstruct them.
 * @augments FeedFilterSettingsSerialized
 * @property {BooleanFilters} booleanFilters - Map of boolean filter names to BooleanFilter instances.
 * @property {NumericFilters} numericFilters - Map of toot number property names to NumericFilter instances.
 */
export interface FeedFilterSettings extends FeedFilterSettingsSerialized {
    booleanFilters: BooleanFilters;
    numericFilters: NumericFilters;
}
/**
 * Utility type to extract the keys of T whose values are an extension of TypeCondition
 * https://www.totaltypescript.com/get-keys-of-an-object-where-values-are-of-a-given-type
 */
export type KeysOfValueType<T, SuperClass> = Exclude<{
    [K in keyof T]: T[K] extends SuperClass ? K : never;
}[keyof T], undefined>;
/**
 * Union type representing any object that can be returned from the Mastodon API and handled by the app
 * in addition to our local extensions like Toot, Account, and TagWithUsageCounts.
 */
export type ApiObj = (ApiObjWithID | MastodonTag | mastodon.v1.TrendLink | string);
/** Most (but not all) Mastodon API objects have an 'id' property. */
export type ApiObjWithID = (Account | TootLike | mastodon.v1.Account | mastodon.v1.Notification | mastodon.v1.Status | mastodon.v2.Filter);
/** Any CacheableApiObj will also be written to localForage with these properties. */
export interface CacheTimestamp {
    isStale: boolean;
    updatedAt: Date;
}
/** ApiObjs are stored in cache as arrays; MastodonInstances is our custom data structure. */
export type CacheableApiObj = (ApiObj[] | MastodonInstances);
/** Local extension to the Mastodon Instance type that adds some additional properties */
export interface MastodonInstance extends mastodon.v2.Instance {
    followedPctOfMAU?: number;
    MAU?: number;
}
export type MastodonTag = (TagWithUsageCounts | mastodon.v1.Tag);
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
/** Abstract interface for objects that have numToots of some kind */
export interface NamedTootCount extends TootCount {
    displayName?: string;
    displayNameWithEmoji?: string;
    name: string;
}
export type ObjListDataSource = (FilterOptionDataSource | FilterProperty | CacheKey.FEDIVERSE_TRENDING_TAGS | ScoreName.FOLLOWED_TAGS);
export type ScoreStats = {
    raw: MinMaxAvgScore[];
    weighted: MinMaxAvgScore[];
};
export type ScoresStats = Record<ScoreName, ScoreStats>;
export type ScoreType = keyof WeightedScore;
export interface TagWithUsageCounts extends mastodon.v1.Tag, NamedTootCount {
    language?: string;
}
export type TootContext = {
    ancestors: Toot[];
    descendants: Toot[];
    toot: Toot;
};
export interface TootCount {
    numAccounts?: number;
    numToots?: number;
    regex?: RegExp;
}
export type TootScore = {
    rawScore: number;
    score: number;
    scores: TootScores;
    timeDecayMultiplier: number;
    trendingMultiplier: number;
    weightedScore: number;
};
export type TootScores = Record<ScoreName, WeightedScore>;
export interface TrendingLink extends mastodon.v1.TrendLink, TootCount {
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
export interface WithCreatedAt {
    createdAt: string | Date;
}
/** All types that can be written to storage. */
export type StorableObj = (CacheableApiObj | FeedFilterSettingsSerialized | ApiObj | StringNumberDict | Weights | number);
export type StorableWithTimestamp = {
    updatedAt: string;
    value: StorableObj;
};
export {};
