import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { FilterArgs, WeightName } from "../types";
export declare const FILTERABLE_SCORES: WeightName[];
export interface NumericFilterArgs extends FilterArgs {
    value?: number;
}
export default class NumericFilter extends TootFilter {
    title: WeightName;
    value: number;
    constructor({ invertSelection, title, value }: NumericFilterArgs);
    isAllowed(toot: Toot): boolean;
    updateValue(newValue: number): void;
    toArgs(): NumericFilterArgs;
}
