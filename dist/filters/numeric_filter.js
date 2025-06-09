"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILTERABLE_SCORES = void 0;
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
 * @class
 * @extends TootFilter
 * @property {string} [description] - Optional description of the filter for display or documentation purposes.
 * @property {boolean} [invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {TootNumberProp} title - The property of the toot to filter on (e.g., 'repliesCount').
 * @property {number} value - The minimum value required for the toot property for the toot to be included in the timeline.
 */
class NumericFilter extends toot_filter_1.default {
    title;
    value;
    /**
     * @param {NumericFilterArgs} params - The filter arguments.
     */
    constructor(params) {
        const { invertSelection, title, value } = params;
        const titleStr = title;
        super({
            description: `Minimum number of ${titleStr.replace(/Count$/, '')}`,
            invertSelection,
            title,
        });
        this.title = title;
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
     * Serializes the filter state for storage (e.g., local storage).
     * @returns {NumericFilterArgs} Arguments that can be used to reconstruct the filter.
     */
    toArgs() {
        const filterArgs = super.toArgs();
        filterArgs.value = this.value;
        return filterArgs;
    }
    /**
     * Updates the value of the filter.
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
    static isValidTitle(name) {
        return exports.FILTERABLE_SCORES.includes(name);
    }
}
exports.default = NumericFilter;
;
//# sourceMappingURL=numeric_filter.js.map