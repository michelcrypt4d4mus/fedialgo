"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterOptionName = void 0;
/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language).
 */
const Storage_1 = __importDefault(require("../Storage"));
// This is the order the filters will appear in the UI in the demo app
var FilterOptionName;
(function (FilterOptionName) {
    FilterOptionName["LANGUAGE"] = "language";
    FilterOptionName["HASHTAG"] = "hashtag";
    FilterOptionName["APP"] = "app";
})(FilterOptionName || (exports.FilterOptionName = FilterOptionName = {}));
;
const TOOT_MATCHERS = {
    [FilterOptionName.APP]: (toot, validValues) => {
        return validValues.includes(toot.application?.name);
    },
    [FilterOptionName.LANGUAGE]: (toot, validValues) => {
        return validValues.includes(toot.language || Storage_1.default.getConfig().defaultLanguage);
    },
    [FilterOptionName.HASHTAG]: (toot, validValues) => {
        return toot.tags.some(tag => validValues.includes(tag.name));
    },
};
;
class FeedFilterSection {
    title;
    description;
    invertSelection;
    options;
    optionInfo;
    validValues;
    constructor({ title, description, invertSelection, options, optionInfo, validValues }) {
        this.title = title;
        const descriptionWord = title == FilterOptionName.HASHTAG ? "including" : "from";
        this.description = description ?? `Show only toots ${descriptionWord} these ${title}s`;
        this.invertSelection = invertSelection ?? false;
        this.options = options ?? {};
        this.optionInfo = optionInfo ?? {};
        this.validValues = validValues ?? [];
    }
    // alternate constructor
    static createForOptions(title, options) {
        const section = new FeedFilterSection({ title });
        section.setOptions(options);
        return section;
    }
    // Add a list of strings as options that are all set to false
    setOptions(options) {
        this.options = options.reduce((acc, option) => {
            acc[option] = false;
            return acc;
        }, {});
    }
    // Add a dict of option info (keys will be set as options that are all set to false)
    setOptionsWithInfo(optionInfo) {
        this.optionInfo = optionInfo;
        this.options = Object.keys(optionInfo).reduce((acc, option) => {
            acc[option] = false;
            return acc;
        }, {});
    }
    // Return true if the toot should appear in the timeline feed
    isAllowed(toot) {
        if (this.validValues.length === 0)
            return true; // if there's no validValues allow everything
        const isMatched = TOOT_MATCHERS[this.title](toot, this.validValues);
        return this.invertSelection ? !isMatched : isMatched;
    }
    // Add the element to the filters array if it's not already there or remove it if it is
    updateValidOptions(element, isValidOption) {
        console.debug(`Updating options for ${this.title} with ${element} and ${isValidOption}`);
        if (isValidOption) {
            this.validValues.push(element); // TODO: maybe check that it's not already there to avoid concurrency issues?
        }
        else {
            this.validValues.splice(this.validValues.indexOf(element), 1);
        }
    }
    toArgs() {
        return {
            title: this.title,
            description: this.description,
            validValues: this.validValues,
            invertSelection: this.invertSelection,
            options: this.options,
        };
    }
}
exports.default = FeedFilterSection;
;
//# sourceMappingURL=feed_filter_section.js.map