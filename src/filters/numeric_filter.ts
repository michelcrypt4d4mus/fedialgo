/*
 * Put a minimum number on things like reblogs and replies.
 */
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { type FilterArgs, type TootNumberProp } from "../types";

/**
 * List of toot numeric properties that can be filtered.
 * @type {TootNumberProp[]}
 */
export const FILTERABLE_SCORES: TootNumberProp[] = [
    "repliesCount",
    "reblogsCount",
    "favouritesCount",
];

/**
 * Arguments for constructing a NumericFilter.
 * @interface
 * @extends FilterArgs
 * @property {number} [value] - The minimum value for the filter.
 */
export interface NumericFilterArgs extends FilterArgs {
    value?: number;
};

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
    constructor({ invertSelection, title, value }: NumericFilterArgs) {
        const titleStr = title as string;

        super({
            description: `Minimum number of ${titleStr.replace(/Count$/, '')}`,
            invertSelection,
            title,
        })

        this.title = title as TootNumberProp;
        this.value = value ?? 0;
    }

    /**
     * Determines if a toot passes the numeric filter.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean} True if the toot should appear in the timeline feed.
     */
    isAllowed(toot: Toot): boolean {
        if (this.invertSelection && this.value === 0) return true;  // 0 doesn't work as a maximum
        const propertyValue = toot.realToot[this.title];

        if (!propertyValue && propertyValue !== 0) {
            let msg = `No value found for ${this.title} (interrupted scoring?) in toot: ${toot.describe()}`;
            this.logger.warn(msg);
            // isDebugMode ? console.warn(msg, toot) : console.warn(`${msg} ${toot.describe()}`);
            return true;
        }

        const isOK = propertyValue >= this.value;
        return this.invertSelection ? !isOK : isOK;
    }

    /**
     * Serializes the filter settings for storage (e.g., local storage).
     * @returns {NumericFilterArgs} The arguments representing the filter state.
     */
    toArgs(): NumericFilterArgs {
        const filterArgs = super.toArgs() as NumericFilterArgs;
        filterArgs.value = this.value;
        return filterArgs;
    }

    /**
     * Updates the value of the filter.
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
    static isValidTitle(name: string) {
        return FILTERABLE_SCORES.includes(name as TootNumberProp);
    }
};
