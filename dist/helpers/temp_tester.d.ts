import { TagTootsCacheKey, ScoreName } from '../enums';
import { BooleanFilterName } from '../filters/boolean_filter';
export declare const FILTER_OPTION_DATA_SOURCES: readonly [...TagTootsCacheKey[], BooleanFilterName.LANGUAGE, ScoreName.FAVOURITED_ACCOUNTS];
export type FilterOptionDataSource = (typeof FILTER_OPTION_DATA_SOURCES)[number];
