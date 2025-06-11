/*
 * Filter toots based on numeric properties like replies, reblogs, and favourites.
 */
import { isFinite, isNil } from 'lodash';

import Toot from '../api/objects/toot';
import TootFilter, { type FilterArgs } from "./toot_filter";
import { type TootNumberProp } from "../types";

// List of toot numeric properties that can be filtered.
export const FILTERABLE_SCORES: TootNumberProp[] = [
    "repliesCount",
    "reblogsCount",
    "favouritesCount",
];

export interface NumericFilterArgs extends Omit<FilterArgs, "description"> {
    propertyName: TootNumberProp;
    value?: number;
};


/**
 * Filter for numeric properties of a Toot (e.g., replies, reblogs, favourites).
 * Allows filtering toots based on a minimum value for a given property.
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
    constructor(params: NumericFilterArgs) {
        const { invertSelection, propertyName, value } = params;

        super({
            description: `Minimum number of ${propertyName.replace(/Count$/, '')}`,
            invertSelection,
            propertyName,
        })

        this.propertyName = propertyName;
        this.value = value ?? 0;
    }

    /**
     * Check if the toot meets the filter criterion.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean} True if the toot should appear in the timeline feed.
     */
    isAllowed(toot: Toot): boolean {
        if (this.invertSelection && this.value === 0) return true;  // 0 doesn't work as a maximum
        const propertyValue = toot.realToot[this.propertyName];

        if (!isFinite(propertyValue)) {
            this.logger.warn(`No value found for ${this.propertyName} (interrupted scoring?) in toot: ${toot.description}`);
            return true;
        }

        const isOK = propertyValue >= this.value;
        return this.invertSelection ? !isOK : isOK;
    }

    /**
     * Serializes the filter state for storage.
     * @returns {NumericFilterArgs} Arguments that can be used to reconstruct the filter.
     */
    toArgs(): NumericFilterArgs {
        const filterArgs = super.toArgs() as NumericFilterArgs;
        filterArgs.value = this.value;
        return filterArgs;
    }

    /**
     * Updates the filter's 'value' property.
     * @param {number} newValue - The new minimum value for the filter.
     */
    updateValue(newValue: number): void {
        this.value = newValue;
    }

    /**
     * Checks if a given property name is a valid numeric filter name.
     * @param {string} name - The property name to check.
     * @returns {boolean} True if the name is a filterable numeric property.
     */
    static isValidFilterProperty(name: string | undefined): boolean {
        return !isNil(name) && FILTERABLE_SCORES.includes(name as TootNumberProp);
    }
};
