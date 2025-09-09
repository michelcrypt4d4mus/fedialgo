import TootFilter, { type FilterArgs } from "./toot_filter";
import type Toot from '../api/objects/toot';
import { type TootNumberProp } from "../types";
export declare const FILTERABLE_SCORES: TootNumberProp[];
export interface NumericFilterArgs extends Omit<FilterArgs, "description"> {
    propertyName: TootNumberProp;
    value?: number;
}
/**
 * Filter for numeric properties of a {@linkcode Toot} (e.g., replies, reblogs, favourites).
 * Allows filtering {@linkcode Toot}s based on a minimum value for a given property.
 * @augments TootFilter
 * @property {string} [description] - Optional description of the filter for display or documentation purposes.
 * @property {boolean} [invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {TootNumberProp} propertyName - The property of the toot to filter on (e.g., 'repliesCount').
 * @property {number} value - Minimum value a toot must have in the 'propertyName' field to be included in the timeline.
 */
export default class NumericFilter extends TootFilter {
    propertyName: TootNumberProp;
    value: number;
    /**
     * @param {NumericFilterArgs} params - The filter arguments.
     * @param {boolean} [params.invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
     * @param {TootNumberProp} params.propertyName - Toot property to filter on (e.g., 'repliesCount').
     * @param {number} [params.value] - The minimum value for the filter.
     */
    constructor(params: NumericFilterArgs);
    /**
     * Check if the {@linkcode Toot} meets the filter criterion.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean} True if the toot should appear in the timeline feed.
     */
    isAllowed(toot: Toot): boolean;
    /**
     * Serializes the filter state for storage.
     * @returns {NumericFilterArgs} Arguments that can be used to reconstruct the filter.
     */
    toArgs(): NumericFilterArgs;
    /**
     * Updates the filter's {@linkcode value} property.
     * @param {number} newValue - The new minimum value for the filter.
     */
    updateValue(newValue: number): void;
    /**
     * Checks if a given property name is a valid numeric filter name.
     * @param {string} name - The property name to check.
     * @returns {boolean} True if the name is a filterable numeric property.
     */
    static isValidFilterProperty(name: string | undefined): boolean;
}
