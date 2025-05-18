"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_FILTERS = exports.TypeFilterName = exports.BooleanFilterName = void 0;
const toot_filter_1 = __importDefault(require("./toot_filter"));
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";
// This is the order the filters will appear in the UI in the demo app
var BooleanFilterName;
(function (BooleanFilterName) {
    BooleanFilterName["TYPE"] = "type";
    BooleanFilterName["LANGUAGE"] = "language";
    BooleanFilterName["HASHTAG"] = "hashtag";
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
    TypeFilterName["POLLS"] = "polls";
    TypeFilterName["PARTICIPATED_HASHTAGS"] = "participatedHashtags";
    TypeFilterName["PRIVATE"] = "private";
    TypeFilterName["REPLIES"] = "replies";
    TypeFilterName["RETOOTS"] = "retoots";
    TypeFilterName["SENSITIVE"] = "sensitive";
    TypeFilterName["SPOILERED"] = "spoilered";
    TypeFilterName["TRENDING_HASHTAGS"] = "trendingHashtags";
    TypeFilterName["TRENDING_LINKS"] = "trendingLinks";
    TypeFilterName["TRENDING_TOOTS"] = "trendingToots";
    TypeFilterName["VIDEOS"] = "videos";
})(TypeFilterName || (exports.TypeFilterName = TypeFilterName = {}));
;
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
    [TypeFilterName.PARTICIPATED_HASHTAGS]: (toot) => !!toot.realToot().participatedTags?.length,
    [TypeFilterName.PRIVATE]: (toot) => !!toot.realToot().isPrivate(),
    [TypeFilterName.REPLIES]: (toot) => !!toot.realToot().inReplyToId,
    [TypeFilterName.RETOOTS]: (toot) => !!toot.reblog,
    [TypeFilterName.SENSITIVE]: (toot) => !!toot.realToot().sensitive,
    [TypeFilterName.SPOILERED]: (toot) => !!toot.realToot().spoilerText,
    [TypeFilterName.TRENDING_HASHTAGS]: (toot) => !!toot.realToot().trendingTags?.length,
    [TypeFilterName.TRENDING_LINKS]: (toot) => !!toot.realToot().trendingLinks?.length,
    [TypeFilterName.TRENDING_TOOTS]: (toot) => !!toot.realToot().trendingRank,
    [TypeFilterName.VIDEOS]: (toot) => !!toot.realToot().videoAttachments.length,
};
// Defining a new filter category just requires adding a new entry to TYPE_FILTERS
const TOOT_MATCHERS = {
    [BooleanFilterName.APP]: (toot, validValues) => {
        return validValues.includes(toot.realToot().application?.name);
    },
    [BooleanFilterName.LANGUAGE]: (toot, validValues) => {
        return validValues.includes(toot.realToot().language || config_1.Config.defaultLanguage);
    },
    [BooleanFilterName.HASHTAG]: (toot, validValues) => {
        return !!validValues.find((v) => toot.realToot().containsTag(v, true));
    },
    [BooleanFilterName.TYPE]: (toot, validValues) => {
        return validValues.every((v) => exports.TYPE_FILTERS[v](toot));
    },
    [BooleanFilterName.USER]: (toot, validValues) => {
        return validValues.includes(toot.realToot().account.webfingerURI);
    },
};
;
class BooleanFilter extends toot_filter_1.default {
    title;
    optionInfo;
    effectiveOptionInfo = {}; // optionInfo with the counts of toots that match the filter
    validValues;
    visible = true; // true if the filter should be returned via TheAlgorithm.getFilters()
    constructor({ title, invertSelection, optionInfo, validValues }) {
        optionInfo ??= {};
        let description;
        if (title == BooleanFilterName.TYPE) {
            // Set up the default for type filters so something always shows up in the options
            optionInfo = (0, collection_helpers_1.countValues)(Object.values(TypeFilterName));
            description = SOURCE_FILTER_DESCRIPTION;
        }
        else {
            const descriptionWord = title == BooleanFilterName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${title}s`;
        }
        super({ description, invertSelection, title });
        this.title = title;
        this.optionInfo = optionInfo ?? {};
        this.validValues = validValues ?? [];
        // The app filter is kind of useless so we mark it as invisible via config option
        if (this.title == BooleanFilterName.APP) {
            this.visible = config_1.Config.isAppFilterVisible;
        }
    }
    // Return true if the toot matches the filter
    isAllowed(toot) {
        // If there's no validValues allow everything
        if (this.validValues.length === 0)
            return true;
        const isMatched = TOOT_MATCHERS[this.title](toot, this.validValues);
        return this.invertSelection ? !isMatched : isMatched;
    }
    // Update the filter with the possible options that can be selected for validValues
    setOptions(optionInfo) {
        // Filter out any options that are no longer valid
        this.validValues = this.validValues.filter((v) => v in optionInfo);
        this.optionInfo = { ...optionInfo }; // TODO: this is to trigger useMemo() in the demo app, not great
    }
    // Add the element to the filters array if it's not already there or remove it if it is
    // If isValidOption is false remove the element from the filter instead of adding it
    updateValidOptions(element, isValidOption) {
        console.debug(`Updating options for ${this.title} with ${element} and ${isValidOption}`);
        if (isValidOption && !this.validValues.includes(element)) {
            this.validValues.push(element);
        }
        else {
            if (!this.validValues.includes(element)) {
                console.warn(`Tried to remove ${element} from ${this.title} but it wasn't there`);
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