"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILTERABLE_SCORES = void 0;
/**
 * @fileoverview Filter toots based on numeric properties like replies, reblogs, and favourites.
 */
const lodash_1 = require("lodash");
const toot_filter_1 = __importDefault(require("./toot_filter"));
// List of toot numeric properties that can be filtered.
exports.FILTERABLE_SCORES = [
    "repliesCount",
    "reblogsCount",
    "favouritesCount",
];
;
/**
 * Filter for numeric properties of a Toot (e.g., replies, reblogs, favourites).
 * Allows filtering toots based on a minimum value for a given property.
 * @augments TootFilter
 * @property {string} [description] - Optional description of the filter for display or documentation purposes.
 * @property {boolean} [invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {TootNumberProp} propertyName - The property of the toot to filter on (e.g., 'repliesCount').
 * @property {number} value - Minimum value a toot must have in the 'propertyName' field to be included in the timeline.
 */
class NumericFilter extends toot_filter_1.default {
    propertyName;
    value;
    /**
     * @param {NumericFilterArgs} params - The filter arguments.
     * @param {boolean} [params.invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
     * @param {TootNumberProp} params.propertyName - Toot property to filter on (e.g., 'repliesCount').
     * @param {number} [params.value] - The minimum value for the filter.
     */
    constructor(params) {
        const { invertSelection, propertyName, value } = params;
        super({
            description: `Minimum number of ${propertyName.replace(/Count$/, '')}`,
            invertSelection,
            propertyName,
        });
        this.propertyName = propertyName;
        this.value = value ?? 0;
    }
    /**
     * Check if the toot meets the filter criterion.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean} True if the toot should appear in the timeline feed.
     */
    isAllowed(toot) {
        if (this.invertSelection && this.value === 0)
            return true; // 0 doesn't work as a maximum
        const propertyValue = toot.realToot[this.propertyName];
        if (!(0, lodash_1.isFinite)(propertyValue)) {
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
    toArgs() {
        const filterArgs = super.toArgs();
        filterArgs.value = this.value;
        return filterArgs;
    }
    /**
     * Updates the filter's 'value' property.
     * @param {number} newValue - The new minimum value for the filter.
     */
    updateValue(newValue) {
        this.value = newValue;
    }
    /**
     * Checks if a given property name is a valid numeric filter name.
     * @param {string} name - The property name to check.
     * @returns {boolean} True if the name is a filterable numeric property.
     */
    static isValidFilterProperty(name) {
        return !(0, lodash_1.isNil)(name) && exports.FILTERABLE_SCORES.includes(name);
    }
}
exports.default = NumericFilter;
;
//# sourceMappingURL=numeric_filter.js.map