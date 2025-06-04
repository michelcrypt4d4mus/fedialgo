"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_FILTERS = exports.isTypeFilterName = exports.isBooleanFilterName = void 0;
/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 */
const boolean_filter_option_list_1 = __importDefault(require("./boolean_filter_option_list"));
const api_1 = __importDefault(require("../api/api"));
const tag_list_1 = __importDefault(require("../api/tag_list"));
const toot_filter_1 = __importDefault(require("./toot_filter"));
const enums_1 = require("../enums");
const string_helpers_1 = require("../helpers/string_helpers");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const language_helper_1 = require("../helpers/language_helper");
const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";
const isBooleanFilterName = (value) => (0, collection_helpers_1.isValueInStringEnum)(enums_1.BooleanFilterName)(value);
exports.isBooleanFilterName = isBooleanFilterName;
const isTypeFilterName = (value) => (0, collection_helpers_1.isValueInStringEnum)(enums_1.TypeFilterName)(value);
exports.isTypeFilterName = isTypeFilterName;
// Defining a new filter just requires adding a new entry to TYPE_FILTERS
exports.TYPE_FILTERS = {
    [enums_1.TypeFilterName.AUDIO]: (toot) => !!toot.realToot().audioAttachments?.length,
    [enums_1.TypeFilterName.BOT]: (toot) => !!(toot.account.bot || toot.reblog?.account.bot),
    [enums_1.TypeFilterName.DIRECT_MESSAGE]: (toot) => toot.isDM(),
    [enums_1.TypeFilterName.FOLLOWED_ACCOUNTS]: (toot) => !!(toot.account.isFollowed || toot.reblog?.account.isFollowed),
    [enums_1.TypeFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.realToot().followedTags?.length,
    [enums_1.TypeFilterName.IMAGES]: (toot) => !!toot.realToot().imageAttachments?.length,
    [enums_1.TypeFilterName.LINKS]: (toot) => !!(toot.realToot().card || toot.realToot().trendingLinks?.length),
    [enums_1.TypeFilterName.MENTIONS]: (toot) => toot.containsUserMention(),
    [enums_1.TypeFilterName.POLLS]: (toot) => !!toot.realToot().poll,
    [enums_1.TypeFilterName.PARTICIPATED_TAGS]: (toot) => !!toot.realToot().participatedTags?.length,
    [enums_1.TypeFilterName.PRIVATE]: (toot) => !!toot.realToot().isPrivate(),
    [enums_1.TypeFilterName.REPLIES]: (toot) => !!toot.realToot().inReplyToId,
    [enums_1.TypeFilterName.RETOOTS]: (toot) => !!toot.reblog,
    [enums_1.TypeFilterName.SENSITIVE]: (toot) => !!toot.realToot().sensitive,
    [enums_1.TypeFilterName.SPOILERED]: (toot) => !!toot.realToot().spoilerText,
    [enums_1.TypeFilterName.TRENDING_LINKS]: (toot) => !!toot.realToot().trendingLinks?.length,
    [enums_1.TypeFilterName.TRENDING_TAGS]: (toot) => !!toot.realToot().trendingTags?.length,
    [enums_1.TypeFilterName.TRENDING_TOOTS]: (toot) => !!toot.realToot().trendingRank,
    [enums_1.TypeFilterName.VIDEOS]: (toot) => !!toot.realToot().videoAttachments?.length,
};
// Defining a new filter category just requires adding a new entry to TYPE_FILTERS
const TOOT_MATCHERS = {
    [enums_1.BooleanFilterName.APP]: (toot, selectedOptions) => {
        return selectedOptions.includes(toot.realToot().application?.name);
    },
    [enums_1.BooleanFilterName.HASHTAG]: (toot, selectedOptions) => {
        return !!selectedOptions.find((v) => toot.realToot().containsString(v));
    },
    [enums_1.BooleanFilterName.LANGUAGE]: (toot, selectedOptions) => {
        return selectedOptions.includes(toot.realToot().language || config_1.config.locale.defaultLanguage);
    },
    [enums_1.BooleanFilterName.TYPE]: (toot, selectedOptions) => {
        return selectedOptions.some((v) => exports.TYPE_FILTERS[v](toot));
    },
    [enums_1.BooleanFilterName.USER]: (toot, selectedOptions) => {
        return selectedOptions.includes(toot.realToot().account.webfingerURI);
    },
};
;
class BooleanFilter extends toot_filter_1.default {
    options; // e.g. counts of toots with this option
    selectedOptions; // Which options are selected for use in the filter
    title;
    constructor({ title, invertSelection, selectedOptions }) {
        let optionInfo;
        let description;
        // Set up defaults for type filters so something always shows up in the options // TODO: is this necessary?
        if (title == enums_1.BooleanFilterName.TYPE) {
            description = SOURCE_FILTER_DESCRIPTION;
            const optionCounts = (0, collection_helpers_1.countValues)(Object.values(enums_1.TypeFilterName));
            optionInfo = boolean_filter_option_list_1.default.buildFromDict(optionCounts, title);
        }
        else {
            const descriptionWord = title == enums_1.BooleanFilterName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${title}s`;
            optionInfo = new boolean_filter_option_list_1.default([], title);
        }
        super({ description, invertSelection, title });
        this.options = optionInfo;
        this.title = title;
        this.selectedOptions = selectedOptions ?? [];
    }
    // Return true if the toot matches the filter
    isAllowed(toot) {
        // If there's no selectedOptions allow everything
        if (!this.selectedOptions.length)
            return true;
        const isMatched = TOOT_MATCHERS[this.title](toot, this.selectedOptions);
        return this.invertSelection ? !isMatched : isMatched;
    }
    // If the option is in selectedOptions then it's enabled
    isOptionEnabled(optionName) {
        return this.selectedOptions.includes(optionName);
    }
    // Return only options that have at least minToots or are in selectedOptions
    optionListWithMinToots(options, minToots = 0) {
        options = options.filter(opt => (opt.numToots || 0) >= minToots || this.isOptionEnabled(opt.name));
        return new boolean_filter_option_list_1.default(options, this.title);
    }
    // If minToots is set then only return options with a value greater than or equal to minValue
    // along with any 'selectedOptions' entries that are below that threshold.
    optionsSortedByName(minToots = 0) {
        let options = this.options.objs.toSorted((a, b) => (0, string_helpers_1.compareStr)(a.name, b.name));
        return this.optionListWithMinToots(options, minToots);
    }
    // Sort options by numToots, then by name
    optionsSortedByValue(minToots = 0) {
        return this.optionListWithMinToots(this.options.topObjs(), minToots);
    }
    // Update the filter with the possible options that can be selected for selectedOptions
    async setOptions(optionInfo, optionProps) {
        this.options = boolean_filter_option_list_1.default.buildFromDict(optionInfo, this.title);
        this.selectedOptions = this.selectedOptions.filter((v) => v in optionInfo); // Remove options that are no longer valid
        // Populate additional properties on each option - participation counts, favourited counts, etc.
        if (this.title == enums_1.BooleanFilterName.HASHTAG) {
            const dataForTagPropLists = await tag_list_1.default.allTagTootsLists();
            Object.entries(dataForTagPropLists).forEach(([key, tagList]) => {
                this.options.objs.forEach((option) => {
                    if (tagList.getObj(option.name)) {
                        option[key] = tagList.getObj(option.name).numToots || 0;
                    }
                });
            });
        }
        else if (this.title == enums_1.BooleanFilterName.LANGUAGE) {
            const userData = await api_1.default.instance.getUserData();
            this.options.objs.forEach((option) => {
                option.displayName = (0, language_helper_1.languageName)(option.name);
                option[enums_1.BooleanFilterName.LANGUAGE] = userData.languagesPostedIn.getObj(option.name)?.numToots;
            });
        }
        else if (this.title == enums_1.BooleanFilterName.USER) {
            const favouritedAccounts = (await api_1.default.instance.getUserData()).favouriteAccounts;
            this.options.objs.forEach((option) => {
                const accountOption = favouritedAccounts.getObj(option.name);
                const optionProp = optionProps?.[option.name];
                if (accountOption) {
                    option.displayName ??= accountOption.displayName;
                    option[enums_1.ScoreName.FAVOURITED_ACCOUNTS] = accountOption.numToots || 0;
                }
                if (optionProp) {
                    option.displayName ??= optionProp.displayName;
                }
            });
        }
    }
    // Add the element to the filters array if it's not already there or remove it if it is
    // If isValidOption is false remove the element from the filter instead of adding it
    updateOption(optionName, isSelected) {
        this.logger.debug(`Updating options for ${this.title} with ${optionName} and ${isSelected}`);
        if (isSelected && !this.isOptionEnabled(optionName)) {
            this.selectedOptions.push(optionName);
        }
        else {
            if (!this.isOptionEnabled(optionName)) {
                this.logger.warn(`Tried to remove ${optionName} from ${this.title} but it wasn't there`);
                return;
            }
            this.selectedOptions.splice(this.selectedOptions.indexOf(optionName), 1);
        }
        // Remove duplicates; build new Array object to trigger useMemo() in Demo App // TODO: not great
        this.selectedOptions = [...new Set(this.selectedOptions)];
    }
    // Required for serialization of settings to local storage
    toArgs() {
        const filterArgs = super.toArgs();
        filterArgs.selectedOptions = this.selectedOptions;
        return filterArgs;
    }
}
exports.default = BooleanFilter;
;
//# sourceMappingURL=boolean_filter.js.map