import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { FilterArgs, ScoreName } from "../types";
export declare const FILTERABLE_SCORES: ScoreName[];
export declare const isNumericFilterName: (name: string) => boolean;
export interface NumericFilterArgs extends FilterArgs {
    value?: number;
}
export default class NumericFilter extends TootFilter {
    title: ScoreName;
    value: number;
    constructor({ invertSelection, title, value }: NumericFilterArgs);
    isAllowed(toot: Toot): boolean;
    updateValue(newValue: number): void;
    toArgs(): NumericFilterArgs;
}
