import { TagTootsCacheKey, ScoreName } from '../enums';
import { BooleanFilterName } from '../enums';


// These server as both Both filter option property names as well as demo app gradient config keys
export const FILTER_OPTION_DATA_SOURCES = [
    ...Object.values(TagTootsCacheKey), // TODO: these are really the wrong cache keys for the use case but it's consistent w/demo app for now
    BooleanFilterName.LANGUAGE,
    ScoreName.FAVOURITED_ACCOUNTS,
] as const;


export type FilterOptionDataSource = (typeof FILTER_OPTION_DATA_SOURCES)[number];
