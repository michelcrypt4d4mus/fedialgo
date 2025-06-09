import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { type FilterArgs, type TootNumberProp } from "../types";
/**
 * List of toot numeric properties that can be filtered.
 * @type {TootNumberProp[]}
 */
export declare const FILTERABLE_SCORES: TootNumberProp[];
/**
 * Checks if a given property name is a valid numeric filter name.
 * @param {string} name - The property name to check.
 * @returns {boolean} True if the name is a filterable numeric property.
 */
export declare const isNumericFilterName: (name: string) => boolean;
/**
 * Arguments for constructing a NumericFilter.
 * @interface
 * @extends FilterArgs
 * @property {number} [value] - The minimum value for the filter.
 */
export interface NumericFilterArgs extends FilterArgs {
    value?: number;
}
/**
 * Filter for numeric properties of a Toot (e.g., replies, reblogs, favourites).
 * Allows filtering toots based on a minimum value for a given property.
 * @extends TootFilter
 */
export default class NumericFilter extends TootFilter {
    /**
     * The property of the toot to filter on (e.g., 'repliesCount').
     */
    title: TootNumberProp;
    /**
     * The minimum value required for the toot property for the toot to be included in the timeline.
     */
    value: number;
    /**
     * Creates a NumericFilter instance.
     * @param {NumericFilterArgs} param0 - The filter arguments.
     */
    constructor({ invertSelection, title, value }: NumericFilterArgs);
    /**
     * Determines if a toot passes the numeric filter.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean} True if the toot should appear in the timeline feed.
     */
    isAllowed(toot: Toot): boolean;
    /**
     * Serializes the filter settings for storage (e.g., local storage).
     * @returns {NumericFilterArgs} The arguments representing the filter state.
     */
    toArgs(): NumericFilterArgs;
    /**
     * Updates the value of the filter.
     * @param {number} newValue - The new minimum value for the filter.
     */
    updateValue(newValue: number): void;
}
