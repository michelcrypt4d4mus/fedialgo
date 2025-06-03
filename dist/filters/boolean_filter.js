"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_FILTERS = exports.isTypeFilterName = exports.isBooleanFilterName = exports.TypeFilterName = exports.BooleanFilterName = void 0;
/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 */
const api_1 = __importDefault(require("../api/api"));
const boolean_filter_option_list_1 = __importDefault(require("./boolean_filter_option_list"));
const tag_list_1 = __importDefault(require("../api/tag_list"));
const toot_filter_1 = __importDefault(require("./toot_filter"));
const string_helpers_1 = require("../helpers/string_helpers");
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const enums_1 = require("../enums");
const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";
// This is the order the filters will appear in the UI in the demo app
var BooleanFilterName;
(function (BooleanFilterName) {
    BooleanFilterName["HASHTAG"] = "hashtag";
    BooleanFilterName["LANGUAGE"] = "language";
    BooleanFilterName["TYPE"] = "type";
    BooleanFilterName["USER"] = "user";
    BooleanFilterName["APP"] = "app";
})(BooleanFilterName || (exports.BooleanFilterName = BooleanFilterName = {}));
;
var TypeFilterName;
(function (TypeFilterName) {
    TypeFilterName["AUDIO"] = "audio";
    TypeFilterName["BOT"] = "bot";
    TypeFilterName["DIRECT_MESSAGE"] = "directMessages";
    TypeFilterName["FOLLOWED_ACCOUNTS"] = "followedAccounts";
    TypeFilterName["FOLLOWED_HASHTAGS"] = "followedHashtags";
    TypeFilterName["IMAGES"] = "images";
    TypeFilterName["LINKS"] = "links";
    TypeFilterName["MENTIONS"] = "mentions";
    TypeFilterName["PARTICIPATED_TAGS"] = "participatedHashtags";
    TypeFilterName["POLLS"] = "polls";
    TypeFilterName["PRIVATE"] = "private";
    TypeFilterName["REPLIES"] = "replies";
    TypeFilterName["RETOOTS"] = "retoots";
    TypeFilterName["SENSITIVE"] = "sensitive";
    TypeFilterName["SPOILERED"] = "spoilered";
    TypeFilterName["TRENDING_LINKS"] = "trendingLinks";
    TypeFilterName["TRENDING_TAGS"] = "trendingHashtags";
    TypeFilterName["TRENDING_TOOTS"] = "trendingToots";
    TypeFilterName["VIDEOS"] = "videos";
})(TypeFilterName || (exports.TypeFilterName = TypeFilterName = {}));
;
const isBooleanFilterName = (value) => (0, collection_helpers_1.isValueInStringEnum)(BooleanFilterName)(value);
exports.isBooleanFilterName = isBooleanFilterName;
const isTypeFilterName = (value) => (0, collection_helpers_1.isValueInStringEnum)(TypeFilterName)(value);
exports.isTypeFilterName = isTypeFilterName;
// Defining a new filter just requires adding a new entry to TYPE_FILTERS
exports.TYPE_FILTERS = {
    [TypeFilterName.AUDIO]: (toot) => !!toot.realToot().audioAttachments.length,
    [TypeFilterName.BOT]: (toot) => !!(toot.account.bot || toot.reblog?.account.bot),
    [TypeFilterName.DIRECT_MESSAGE]: (toot) => toot.isDM(),
    [TypeFilterName.FOLLOWED_ACCOUNTS]: (toot) => !!(toot.account.isFollowed || toot.reblog?.account.isFollowed),
    [TypeFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.realToot().followedTags?.length,
    [TypeFilterName.IMAGES]: (toot) => !!toot.realToot().imageAttachments.length,
    [TypeFilterName.LINKS]: (toot) => !!(toot.realToot().card || toot.realToot().trendingLinks?.length),
    [TypeFilterName.MENTIONS]: (toot) => toot.containsUserMention(),
    [TypeFilterName.POLLS]: (toot) => !!toot.realToot().poll,
    [TypeFilterName.PARTICIPATED_TAGS]: (toot) => !!toot.realToot().participatedTags?.length,
    [TypeFilterName.PRIVATE]: (toot) => !!toot.realToot().isPrivate(),
    [TypeFilterName.REPLIES]: (toot) => !!toot.realToot().inReplyToId,
    [TypeFilterName.RETOOTS]: (toot) => !!toot.reblog,
    [TypeFilterName.SENSITIVE]: (toot) => !!toot.realToot().sensitive,
    [TypeFilterName.SPOILERED]: (toot) => !!toot.realToot().spoilerText,
    [TypeFilterName.TRENDING_LINKS]: (toot) => !!toot.realToot().trendingLinks?.length,
    [TypeFilterName.TRENDING_TAGS]: (toot) => !!toot.realToot().trendingTags?.length,
    [TypeFilterName.TRENDING_TOOTS]: (toot) => !!toot.realToot().trendingRank,
    [TypeFilterName.VIDEOS]: (toot) => !!toot.realToot().videoAttachments.length,
};
// Defining a new filter category just requires adding a new entry to TYPE_FILTERS
const TOOT_MATCHERS = {
    [BooleanFilterName.APP]: (toot, validValues) => {
        return validValues.includes(toot.realToot().application?.name);
    },
    [BooleanFilterName.HASHTAG]: (toot, validValues) => {
        return !!validValues.find((v) => toot.realToot().containsString(v));
    },
    [BooleanFilterName.LANGUAGE]: (toot, validValues) => {
        return validValues.includes(toot.realToot().language || config_1.config.locale.defaultLanguage);
    },
    [BooleanFilterName.TYPE]: (toot, validValues) => {
        return validValues.some((v) => exports.TYPE_FILTERS[v](toot));
    },
    [BooleanFilterName.USER]: (toot, validValues) => {
        return validValues.includes(toot.realToot().account.webfingerURI);
    },
};
;
class BooleanFilter extends toot_filter_1.default {
    optionInfo; // e.g. counts of toots with this option
    title;
    validValues;
    visible = true; // true if the filter should be returned via TheAlgorithm.getFilters()
    constructor({ title, invertSelection, validValues }) {
        let optionInfo;
        let description;
        // Set up defaults for type filters so something always shows up in the options // TODO: is this necessary?
        if (title == BooleanFilterName.TYPE) {
            description = SOURCE_FILTER_DESCRIPTION;
            const optionCounts = (0, collection_helpers_1.countValues)(Object.values(TypeFilterName));
            optionInfo = boolean_filter_option_list_1.default.buildFromDict(optionCounts, title);
        }
        else {
            const descriptionWord = title == BooleanFilterName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${title}s`;
            optionInfo = new boolean_filter_option_list_1.default([], title);
        }
        super({ description, invertSelection, title });
        this.title = title;
        this.optionInfo = optionInfo;
        this.validValues = validValues ?? [];
        // The app filter is kind of useless so we mark it as invisible via config option
        if (this.title == BooleanFilterName.APP) {
            this.visible = config_1.config.gui.isAppFilterVisible;
        }
    }
    // Return true if the toot matches the filter
    isAllowed(toot) {
        // If there's no validValues allow everything
        if (!this.validValues.length)
            return true;
        const isMatched = TOOT_MATCHERS[this.title](toot, this.validValues);
        return this.invertSelection ? !isMatched : isMatched;
    }
    // If the option is in validValues then it's enabled
    isThisSelectionEnabled(optionName) {
        return this.validValues.includes(optionName);
    }
    // Return only options that have at least minToots or are in validValues
    optionListWithMinToots(options, minToots = 0) {
        options = options.filter(o => (o.numToots || 0) >= minToots || this.isThisSelectionEnabled(o.name));
        return new boolean_filter_option_list_1.default(options, this.title);
    }
    // If minToots is set then only return options with a value greater than or equal to minValue
    // along with any 'validValues' entries that are below that threshold.
    optionsSortedByName(minToots = 0) {
        let options = this.optionInfo.objs.toSorted((a, b) => (0, string_helpers_1.compareStr)(a.name, b.name));
        return this.optionListWithMinToots(options, minToots);
    }
    // Sort options by numToots, then by name
    optionsSortedByValue(minToots = 0) {
        return this.optionListWithMinToots(this.optionInfo.topObjs(), minToots);
    }
    // Update the filter with the possible options that can be selected for validValues
    async setOptions(optionInfo) {
        this.optionInfo = boolean_filter_option_list_1.default.buildFromDict(optionInfo, this.title);
        this.validValues = this.validValues.filter((v) => v in optionInfo); // Remove options that are no longer valid
        // Populate additional properties on each option - participation counts, favourited counts, etc.
        if (this.title == BooleanFilterName.HASHTAG) {
            const dataForTagPropLists = await tag_list_1.default.allTagTootsLists();
            Object.entries(dataForTagPropLists).forEach(([key, tagList]) => {
                this.optionInfo.objs.forEach((option) => {
                    if (tagList.getObj(option.name)) {
                        option[key] = tagList.getObj(option.name).numToots || 0;
                    }
                });
            });
        }
        else if (this.title == BooleanFilterName.USER) {
            const favouritedAccounts = (await api_1.default.instance.getUserData()).favouriteAccounts;
            this.optionInfo.objs.forEach((option) => {
                if (favouritedAccounts.getObj(option.name)) {
                    option[enums_1.ScoreName.FAVOURITED_ACCOUNTS] = favouritedAccounts.getObj(option.name).numToots || 0;
                }
            });
        }
    }
    // Add the element to the filters array if it's not already there or remove it if it is
    // If isValidOption is false remove the element from the filter instead of adding it
    updateValidOptions(element, isValidOption) {
        this.logger.debug(`Updating options for ${this.title} with ${element} and ${isValidOption}`);
        if (isValidOption && !this.isThisSelectionEnabled(element)) {
            this.validValues.push(element);
        }
        else {
            if (!this.isThisSelectionEnabled(element)) {
                this.logger.warn(`Tried to remove ${element} from ${this.title} but it wasn't there`);
                return;
            }
            this.validValues.splice(this.validValues.indexOf(element), 1);
        }
        // Remove duplicates; build new Array object to trigger useMemo() in Demo App // TODO: not great
        this.validValues = [...new Set(this.validValues)];
    }
    // Required for serialization of settings to local storage
    toArgs() {
        const filterArgs = super.toArgs();
        filterArgs.validValues = this.validValues;
        return filterArgs;
    }
}
exports.default = BooleanFilter;
;
//# sourceMappingURL=boolean_filter.js.map