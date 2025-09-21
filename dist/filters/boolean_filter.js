"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_FILTERS = void 0;
/**
 * @fileoverview Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 */
const lodash_1 = require("lodash");
const toot_filter_1 = __importDefault(require("./toot_filter"));
const enums_1 = require("../enums");
const counted_list_1 = require("../api/counted_list");
const tag_1 = require("../api/objects/tag");
const string_helpers_1 = require("../helpers/string_helpers");
const config_1 = require("../config");
const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";
// Type-based filters for toots. Defining a new filter just requires adding a new TypeFilterName
// and a function that matches the toot.
exports.TYPE_FILTERS = {
    [enums_1.TypeFilterName.AUDIO]: (toot) => !!toot.realToot.audioAttachments?.length,
    [enums_1.TypeFilterName.BOT]: (toot) => toot.accounts.some(account => account.bot),
    [enums_1.TypeFilterName.DIRECT_MESSAGE]: (toot) => toot.isDM,
    [enums_1.TypeFilterName.FOLLOWED_ACCOUNTS]: (toot) => toot.accounts.some(account => account.isFollowed),
    [enums_1.TypeFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.realToot.followedTags?.length,
    [enums_1.TypeFilterName.IMAGES]: (toot) => !!toot.realToot.imageAttachments?.length,
    [enums_1.TypeFilterName.LINKS]: (toot) => !!(toot.realToot.card || toot.realToot.trendingLinks?.length),
    [enums_1.TypeFilterName.MENTIONS]: (toot) => toot.containsUserMention(),
    [enums_1.TypeFilterName.POLLS]: (toot) => !!toot.realToot.poll,
    [enums_1.TypeFilterName.PARTICIPATED_TAGS]: (toot) => !!toot.realToot.participatedTags?.length,
    [enums_1.TypeFilterName.PRIVATE]: (toot) => toot.realToot.isPrivate,
    [enums_1.TypeFilterName.REPLIES]: (toot) => !!toot.realToot.inReplyToId,
    [enums_1.TypeFilterName.RETOOTS]: (toot) => !!toot.reblog,
    [enums_1.TypeFilterName.SENSITIVE]: (toot) => toot.realToot.sensitive,
    [enums_1.TypeFilterName.SPOILERED]: (toot) => !(0, string_helpers_1.isEmptyStr)(toot.realToot.spoilerText),
    [enums_1.TypeFilterName.TRENDING_LINKS]: (toot) => !!toot.realToot.trendingLinks?.length,
    [enums_1.TypeFilterName.TRENDING_TAGS]: (toot) => !!toot.realToot.trendingTags?.length,
    [enums_1.TypeFilterName.TRENDING_TOOTS]: (toot) => !!toot.realToot.trendingRank,
    [enums_1.TypeFilterName.VIDEOS]: (toot) => !!toot.realToot.videoAttachments?.length,
};
// Matchers for each BooleanFilterName.
const TOOT_MATCHERS = {
    [enums_1.BooleanFilterName.APP]: (toot, selectedOptions) => {
        return selectedOptions.includes(toot.realToot.application?.name);
    },
    [enums_1.BooleanFilterName.SERVER]: (toot, selectedOptions) => {
        return selectedOptions.includes(toot.homeserver);
    },
    [enums_1.BooleanFilterName.HASHTAG]: (toot, selectedOptions) => {
        return !!selectedOptions.find((v) => toot.realToot.containsTag((0, tag_1.buildTag)(v), true));
    },
    [enums_1.BooleanFilterName.LANGUAGE]: (toot, selectedOptions) => {
        return selectedOptions.includes(toot.realToot.language || config_1.config.locale.defaultLanguage);
    },
    [enums_1.BooleanFilterName.TYPE]: (toot, selectedOptions) => {
        return selectedOptions.some((v) => exports.TYPE_FILTERS[v](toot));
    },
    [enums_1.BooleanFilterName.USER]: (toot, selectedOptions) => {
        return selectedOptions.includes(toot.realToot.account.webfingerURI);
    },
};
;
/**
 * Handles filtering {@linkcode Toot}s by boolean criteria (e.g. language, hashtag, type).
 * @augments TootFilter
 * @property {string} [description] - Optional description of the filter for display or documentation purposes.
 * @property {boolean} [invertSelection] - If true, the filter logic is inverted (e.g. exclude instead of include).
 * @property {BooleanFilterOptionList} options - The BooleanFilterOptions available for this filter.
 * @property {BooleanFilterName} propretyName - The BooleanFilterOptions available for this filter.
 * @property {string[]} selectedOptions - The names of the options selected for use in filtering.
 */
class BooleanFilter extends toot_filter_1.default {
    selectedOptions;
    propertyName;
    get options() { return this._options; }
    ;
    _options;
    /**
     * Set {@linkcode this._options} and remove invalid values from {@linkcode this.selectedOptions}.
     * @param {BooleanFilterOptionList} optionList
     */
    set options(optionList) {
        this._options = optionList;
        this.selectedOptions = this.selectedOptions.filter((v) => !optionList.getObj(v));
    }
    /**
     * @param {BooleanFilterArgs} params - The filter arguments.
     * @param {boolean} [params.invertSelection] - If true, the filter logic is inverted (e.g. exclude instead of include).
     * @param {string[]} [params.selectedOptions] - The selected options.
     * @param {BooleanFilterName} params.propertyName - The property the filter is working with (hashtags/toot type/etc).
     */
    constructor(params) {
        const { invertSelection, propertyName, selectedOptions } = params;
        const optionInfo = new counted_list_1.BooleanFilterOptionList([], propertyName);
        let description;
        if (propertyName == enums_1.BooleanFilterName.TYPE) {
            description = SOURCE_FILTER_DESCRIPTION;
        }
        else {
            const descriptionWord = propertyName == enums_1.BooleanFilterName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${propertyName}s`;
        }
        super({ description, invertSelection, propertyName });
        this._options = optionInfo;
        this.propertyName = propertyName;
        this.selectedOptions = selectedOptions ?? [];
    }
    /**
     * Return true if the {@linkcode Toot} matches the filter.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean}
     */
    isAllowed(toot) {
        if (!this.selectedOptions.length)
            return true; // If there's no selectedOptions allow everything
        const isMatched = TOOT_MATCHERS[this.propertyName](toot, this.selectedOptions);
        return this.invertSelection ? !isMatched : isMatched;
    }
    /**
     * Return true if the option is in {@linkcode this.selectedOptions}.
     * @param {string} optionName - The option name.
     * @returns {boolean}
     */
    isOptionEnabled(optionName) {
        return this.selectedOptions.includes(optionName);
    }
    /**
     * Return options with {@linkcode numToots} >= {@linkcode minToots} sorted by name
     * ({@linkcode this.selectedOptions} are always included).
     * @param {number} [minToots=0] - Minimum number of toots.
     * @param {boolean} [includeFollowed=false] - Always include options with {@linkcode isFollowed} set to true.
     * @returns {BooleanFilterOptionList}
     */
    optionsSortedByName(minToots = 0, includeFollowed = false) {
        const options = this.options.objs.toSorted((a, b) => (0, string_helpers_1.compareStr)(a.displayName || a.name, b.displayName || b.name));
        return this.optionListWithMinToots(options, minToots, includeFollowed);
    }
    /**
     * Return options with {@linkcode numToots} >= {@linkcode minToots} sorted by {@linkcode numToots}
     * ({@linkcode this.selectedOptions} are always included).
     * @param {number} [minToots=0] - Minimum number of toots.
     * @param {boolean} [includeFollowed=false] - Always include options with {@linkcode isFollowed} set to true.
     * @returns {BooleanFilterOptionList}
     */
    optionsSortedByValue(minToots = 0, includeFollowed = false) {
        const sortedObjs = this.optionListWithMinToots(this.options.topObjs(), minToots, includeFollowed);
        this.logger.trace(`optionsSortedByValue() sortedObjs:`, sortedObjs.objs);
        return sortedObjs;
    }
    /**
     * Add or remove an option to/remove an option from {@linkcode this.selectedOptions}.
     * @param {string} optionName - The option name.
     * @param {boolean} isSelected - If true, add the option; if false, remove it.
     * @param {boolean} [allowMultiSelect=true] - If false, only one option can be selected at a time.
     */
    updateOption(optionName, isSelected, allowMultiSelect = true) {
        this.logger.trace(`updateOption(${optionName}, ${isSelected}, ${allowMultiSelect}) invoked`);
        if (!allowMultiSelect && isSelected) {
            this.selectedOptions = [optionName];
            this.logger.trace(`updateOption with no multiselect so set selectedOptions to`, this.selectedOptions);
            return;
        }
        if (isSelected && !this.isOptionEnabled(optionName)) {
            this.selectedOptions.push(optionName);
        }
        else {
            if (!this.isOptionEnabled(optionName)) {
                this.logger.warn(`Tried to remove ${optionName} from ${this.propertyName} but it wasn't there`);
                return;
            }
            this.selectedOptions.splice(this.selectedOptions.indexOf(optionName), 1);
        }
        // Remove duplicates; build new Array object to trigger useMemo() in Demo App  // TODO: not great
        this.selectedOptions = [...new Set(this.selectedOptions)];
    }
    /**
     * Required for serialization of settings to local storage.
     * @returns {BooleanFilterArgs} Serialized arguments used to construct this filter.
     */
    toArgs() {
        const filterArgs = super.toArgs();
        filterArgs.selectedOptions = this.selectedOptions;
        return filterArgs;
    }
    /**
     * Return only options that have at least {@linkcode minToots} or are in {@linkcode selectedOptions}.
     * @private
     * @param {BooleanFilterOption[]} options - The options to filter.
     * @param {number} [minToots=0] - Minimum number of toots.
     * @param {boolean} [includeFollowed=false] - Always include options with {@linkcode isFollowed} set to true.
     * @returns {BooleanFilterOptionList}
     */
    optionListWithMinToots(options, minToots = 0, includeFollowed = false) {
        const newOptions = options.filter(o => {
            return (o.numToots || 0) >= minToots || this.isOptionEnabled(o.name) || (includeFollowed && o.isFollowed);
        });
        this.selectedOptions.forEach((selected) => {
            if (!newOptions.some(opt => opt.name === selected)) {
                this.logger.warn(`Selected option "${selected}" not found in options, adding synthetically`);
                newOptions.push({ name: selected, displayName: selected, numToots: 0 });
            }
        });
        return new counted_list_1.BooleanFilterOptionList(newOptions, this.propertyName);
    }
    /**
     * Checks if a given property name is a valid {@linkcode BooleanFilterName}.
     * @param {string} name - The property name to check.
     * @returns {boolean} True if the name is a filterable numeric property.
     */
    static isValidFilterProperty(name) {
        return !(0, lodash_1.isNil)(name) && (0, enums_1.isValueInStringEnum)(enums_1.BooleanFilterName)(name);
    }
}
exports.default = BooleanFilter;
;
//# sourceMappingURL=boolean_filter.js.map