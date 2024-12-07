"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUMERIC_FILTER_WEIGHTS = void 0;
const types_1 = require("../types");
;
exports.NUMERIC_FILTER_WEIGHTS = [
    types_1.WeightName.NUM_REPLIES,
    types_1.WeightName.NUM_RETOOTS,
    types_1.WeightName.NUM_FAVOURITES,
];
class NumericFilter {
    description;
    invertSelection;
    title;
    value;
    constructor({ invertSelection, title, value }) {
        this.title = title;
        this.description = title;
        if (this.description.startsWith("Num"))
            this.description = this.description.slice(3);
        this.description = `Minimum ${this.description}`;
        this.invertSelection = invertSelection ?? false;
        this.value = value ?? 0;
    }
    // Return true if the toot should appear in the timeline feed
    isAllowed(toot) {
        const tootValue = toot.scoreInfo?.rawScores?.[this.title];
        if (this.invertSelection && this.value === 0)
            return true; // 0 doesn't work as a maximum
        if (!tootValue && tootValue !== 0) {
            console.warn(`No value found for ${this.title} in toot:`, toot);
            return true;
        }
        const isOK = (toot.scoreInfo?.rawScores?.[this.title] || 0) >= this.value;
        return this.invertSelection ? !isOK : isOK;
    }
    // Add the element to the filters array if it's not already there or remove it if it is
    updateValue(newValue) {
        console.debug(`Updating value for ${this.title} with ${newValue}`);
        this.value = newValue;
    }
    // Required for serialization of settings to local storage
    toArgs() {
        return {
            invertSelection: this.invertSelection,
            title: this.title,
            value: this.value
        };
    }
}
exports.default = NumericFilter;
;
//# sourceMappingURL=numeric_filter.js.map