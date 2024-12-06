"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOURCE_FILTERS = exports.SourceFilterName = exports.FilterOptionName = void 0;
/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language).
 */
const Storage_1 = __importDefault(require("../Storage"));
// This is the order the filters will appear in the UI in the demo app
var FilterOptionName;
(function (FilterOptionName) {
    FilterOptionName["SOURCE"] = "source";
    FilterOptionName["LANGUAGE"] = "language";
    FilterOptionName["HASHTAG"] = "hashtag";
    FilterOptionName["APP"] = "app";
})(FilterOptionName || (exports.FilterOptionName = FilterOptionName = {}));
;
var SourceFilterName;
(function (SourceFilterName) {
    SourceFilterName["FOLLOWED_ACCOUNTS"] = "followedAccounts";
    SourceFilterName["FOLLOWED_HASHTAGS"] = "followedHashtags";
    SourceFilterName["LINKS"] = "links";
    SourceFilterName["REPLIES"] = "replies";
    SourceFilterName["REPOSTS"] = "reposts";
    SourceFilterName["TRENDING_HASHTAGS"] = "trendingHashtags";
    SourceFilterName["TRENDING_TOOTS"] = "trendingToots";
})(SourceFilterName || (exports.SourceFilterName = SourceFilterName = {}));
;
exports.SOURCE_FILTERS = {
    [SourceFilterName.LINKS]: (toot) => !!(toot.card || toot.reblog?.card),
    [SourceFilterName.FOLLOWED_ACCOUNTS]: (toot) => !!toot.isFollowed,
    [SourceFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.followedTags?.length,
    [SourceFilterName.REPLIES]: (toot) => !!toot.inReplyToId,
    [SourceFilterName.REPOSTS]: (toot) => !!toot.reblog,
    [SourceFilterName.TRENDING_HASHTAGS]: (toot) => !!toot.trendingTags?.length,
    [SourceFilterName.TRENDING_TOOTS]: (toot) => !!toot.trendingRank,
};
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
    [FilterOptionName.SOURCE]: (toot, validValues) => {
        return Object.entries(exports.SOURCE_FILTERS).some(([filterName, filter]) => {
            return validValues.includes(filterName) && filter(toot);
        });
    },
};
;
const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";
class FeedFilterSection {
    title;
    description;
    invertSelection;
    options;
    optionInfo;
    validValues;
    constructor({ title, invertSelection, options, optionInfo, validValues }) {
        this.title = title;
        if (this.title == FilterOptionName.SOURCE) {
            this.options = Object.values(SourceFilterName).reduce((acc, option) => {
                acc[option] = false;
                return acc;
            }, {});
            this.description = SOURCE_FILTER_DESCRIPTION;
        }
        else {
            this.options = options ?? {};
            const descriptionWord = title == FilterOptionName.HASHTAG ? "including" : "from";
            this.description = `Show only toots ${descriptionWord} these ${title}s`;
        }
        this.invertSelection = invertSelection ?? false;
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
            validValues: this.validValues,
            invertSelection: this.invertSelection,
            options: this.options,
            optionInfo: this.optionInfo,
        };
    }
}
exports.default = FeedFilterSection;
;
//# sourceMappingURL=feed_filter_section.js.map