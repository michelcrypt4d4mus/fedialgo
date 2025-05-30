import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { type FilterArgs, type TootNumberProp } from "../types";
export declare const FILTERABLE_SCORES: TootNumberProp[];
export declare const isNumericFilterName: (name: string) => boolean;
export interface NumericFilterArgs extends FilterArgs {
    value?: number;
}
export default class NumericFilter extends TootFilter {
    title: TootNumberProp;
    value: number;
    constructor({ invertSelection, title, value }: NumericFilterArgs);
    isAllowed(toot: Toot): boolean;
    toArgs(): NumericFilterArgs;
    updateValue(newValue: number): void;
}
