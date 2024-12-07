import { FilterArgs } from "../types";
import { Toot, WeightName } from "../types";
export interface NumericFilterArgs extends FilterArgs {
    value?: number;
}
export declare const FILTERABLE_SCORES: WeightName[];
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
