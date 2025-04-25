"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILTERABLE_SCORES = void 0;
const toot_filter_1 = __importDefault(require("./toot_filter"));
const types_1 = require("../types");
exports.FILTERABLE_SCORES = [
    types_1.WeightName.NUM_REPLIES,
    types_1.WeightName.NUM_RETOOTS,
    types_1.WeightName.NUM_FAVOURITES,
];
;
class NumericFilter extends toot_filter_1.default {
    title;
    value;
    constructor({ invertSelection, title, value }) {
        const titleStr = title;
        super({
            description: `Minimum ${titleStr.startsWith("Num") ? titleStr.slice(3) : title}`,
            invertSelection,
            title,
        });
        this.title = title;
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
    // Update the value of the filter
    updateValue(newValue) {
        this.value = newValue;
    }
    // Required for serialization of settings to local storage
    toArgs() {
        const filterArgs = super.toArgs();
        filterArgs.value = this.value;
        return filterArgs;
    }
}
exports.default = NumericFilter;
;
//# sourceMappingURL=numeric_filter.js.map