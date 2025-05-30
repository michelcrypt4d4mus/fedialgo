"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNumericFilterName = exports.FILTERABLE_SCORES = void 0;
const toot_filter_1 = __importDefault(require("./toot_filter"));
exports.FILTERABLE_SCORES = [
    "repliesCount",
    "reblogsCount",
    "favouritesCount",
];
const isNumericFilterName = (name) => exports.FILTERABLE_SCORES.includes(name);
exports.isNumericFilterName = isNumericFilterName;
;
class NumericFilter extends toot_filter_1.default {
    title;
    value;
    constructor({ invertSelection, title, value }) {
        const titleStr = title;
        super({
            description: `Minimum number of ${titleStr.replace(/Count$/, '')}`,
            invertSelection,
            title,
        });
        this.title = title;
        this.value = value ?? 0;
    }
    // Return true if the toot should appear in the timeline feed
    isAllowed(toot) {
        if (this.invertSelection && this.value === 0)
            return true; // 0 doesn't work as a maximum
        const propertyValue = toot.realToot()[this.title];
        if (!propertyValue && propertyValue !== 0) {
            let msg = `No value found for ${this.title} (interrupted scoring?) in toot: ${toot.describe()}`;
            this.logger.warn(msg);
            // isDebugMode ? console.warn(msg, toot) : console.warn(`${msg} ${toot.describe()}`);
            return true;
        }
        const isOK = propertyValue >= this.value;
        return this.invertSelection ? !isOK : isOK;
    }
    // Required for serialization of settings to local storage
    toArgs() {
        const filterArgs = super.toArgs();
        filterArgs.value = this.value;
        return filterArgs;
    }
    // Update the value of the filter
    updateValue(newValue) {
        this.value = newValue;
    }
}
exports.default = NumericFilter;
;
//# sourceMappingURL=numeric_filter.js.map