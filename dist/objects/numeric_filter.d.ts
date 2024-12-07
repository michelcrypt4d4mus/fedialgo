import { FilterArgs } from "./feed_filter_section";
import { Toot, WeightName } from "../types";
export interface NumericFilterArgs extends FilterArgs {
    value?: number;
}
export declare const NUMERIC_FILTER_WEIGHTS: WeightName[];
export default class NumericFilter {
    description: string;
    invertSelection: boolean;
    title: WeightName;
    value: number;
    constructor({ invertSelection, title, value }: NumericFilterArgs);
    isAllowed(toot: Toot): boolean;
    updateValue(newValue: number): void;
    toArgs(): NumericFilterArgs;
}
