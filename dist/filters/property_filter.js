"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_FILTERS = exports.TypeFilterName = exports.PropertyName = void 0;
const toot_filter_1 = __importDefault(require("./toot_filter"));
const config_1 = require("../config");
const collection_helpers_1 = require("../helpers/collection_helpers");
const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";
// This is the order the filters will appear in the UI in the demo app
var PropertyName;
(function (PropertyName) {
    PropertyName["TYPE"] = "type";
    PropertyName["LANGUAGE"] = "language";
    PropertyName["HASHTAG"] = "hashtag";
    PropertyName["USER"] = "user";
    PropertyName["APP"] = "app";
    // Server Side filters work a bit differently. The API doesn't return toots that match the filter
    // for authenticated requests but for unauthenticated requests (e.g. pulling trending toots from
    // other servers) it does so we have to manually filter them out.
    PropertyName["SERVER_SIDE_FILTERS"] = "ServerFilters";
})(PropertyName || (exports.PropertyName = PropertyName = {}));
;
var TypeFilterName;
(function (TypeFilterName) {
    TypeFilterName["DIRECT_MESSAGE"] = "directMessages";
    TypeFilterName["FOLLOWED_ACCOUNTS"] = "followedAccounts";
    TypeFilterName["FOLLOWED_HASHTAGS"] = "followedHashtags";
    TypeFilterName["LINKS"] = "links";
    TypeFilterName["MENTIONS"] = "mentions";
    TypeFilterName["POLLS"] = "polls";
    TypeFilterName["PARTICIPATED_HASHTAGS"] = "participatedHashtags";
    TypeFilterName["REPLIES"] = "replies";
    TypeFilterName["REPOSTS"] = "reposts";
    TypeFilterName["SENSITIVE"] = "sensitive";
    TypeFilterName["TRENDING_HASHTAGS"] = "trendingHashtags";
    TypeFilterName["TRENDING_LINKS"] = "trendingLinks";
    TypeFilterName["TRENDING_TOOTS"] = "trendingToots";
})(TypeFilterName || (exports.TypeFilterName = TypeFilterName = {}));
;
;
// Defining a new filter just requires adding a new entry to TYPE_FILTERS
exports.TYPE_FILTERS = {
    [TypeFilterName.DIRECT_MESSAGE]: (toot) => toot.isDM(),
    [TypeFilterName.FOLLOWED_ACCOUNTS]: (toot) => !!(toot.isFollowed || toot.reblog?.isFollowed),
    [TypeFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.realToot().followedTags?.length,
    [TypeFilterName.LINKS]: (toot) => !!(toot.realToot().card || toot.realToot().trendingLinks?.length),
    [TypeFilterName.MENTIONS]: (toot) => toot.containsUserMention(),
    [TypeFilterName.POLLS]: (toot) => !!toot.realToot().poll,
    [TypeFilterName.PARTICIPATED_HASHTAGS]: (toot) => !!toot.realToot().participatedTags?.length,
    [TypeFilterName.REPLIES]: (toot) => !!toot.realToot().inReplyToId,
    [TypeFilterName.REPOSTS]: (toot) => !!toot.reblog,
    [TypeFilterName.SENSITIVE]: (toot) => !!toot.sensitive,
    [TypeFilterName.TRENDING_HASHTAGS]: (toot) => !!toot.realToot().trendingTags?.length,
    [TypeFilterName.TRENDING_LINKS]: (toot) => !!toot.realToot().trendingLinks?.length,
    [TypeFilterName.TRENDING_TOOTS]: (toot) => !!toot.realToot().trendingRank,
};
// Defining a new filter category just requires adding a new entry to TYPE_FILTERS
const TOOT_MATCHERS = {
    [PropertyName.APP]: (toot, validValues) => {
        return validValues.includes(toot.realToot().application?.name);
    },
    [PropertyName.LANGUAGE]: (toot, validValues) => {
        return validValues.includes(toot.realToot().language || config_1.Config.defaultLanguage);
    },
    [PropertyName.HASHTAG]: (toot, validValues) => {
        // The old way, using real tags
        // return toot.tags.some(tag => validValues.includes(tag.name));
        // The new way using string search
        return !!validValues.find((v) => toot.realToot().containsString(v));
    },
    [PropertyName.SERVER_SIDE_FILTERS]: (toot, validValues) => {
        return !!validValues.find((v) => toot.realToot().containsString(v));
    },
    [PropertyName.TYPE]: (toot, validValues) => {
        return Object.entries(exports.TYPE_FILTERS).some(([filterName, filter]) => {
            return validValues.includes(filterName) && filter(toot);
        });
    },
    [PropertyName.USER]: (toot, validValues) => {
        return validValues.includes(toot.realToot().account.webfingerURI);
    },
};
class PropertyFilter extends toot_filter_1.default {
    title;
    optionInfo;
    effectiveOptionInfo = {}; // optionInfo with the counts of toots that match the filter
    validValues;
    visible = true; // true if the filter should be returned via TheAlgorithm.getFilters()
    constructor({ title, invertSelection, optionInfo, validValues }) {
        optionInfo ??= {};
        let description;
        if (title == PropertyName.TYPE) {
            // Set up the default for type filters so something always shows up in the options
            optionInfo = (0, collection_helpers_1.countValues)(Object.values(TypeFilterName));
            description = SOURCE_FILTER_DESCRIPTION;
        }
        else {
            const descriptionWord = title == PropertyName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${title}s`;
        }
        super({ description, invertSelection, title });
        this.title = title;
        this.optionInfo = optionInfo ?? {};
        this.validValues = validValues ?? [];
        // Server side filters are invisible & inverted by default bc we don't want to show toots including them
        if (title == PropertyName.SERVER_SIDE_FILTERS) {
            this.invertSelection = invertSelection ?? true;
            this.visible = false;
        }
        else if (this.title = PropertyName.APP) {
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
    setOptions(optionInfo) {
        this.optionInfo = optionInfo;
        // Filter out any options that are no longer valid
        this.validValues = this.validValues.filter((v) => v in optionInfo);
        // Server side filters get all the options immediately set to filter out toots that come
        // from trending and other sources where the user's server configuration is not applied.
        if (this.title == PropertyName.SERVER_SIDE_FILTERS) {
            this.validValues = Object.keys(optionInfo);
        }
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
    // Required for serialization of settings to local storage
    toArgs() {
        const filterArgs = super.toArgs();
        filterArgs.validValues = this.validValues;
        return filterArgs;
    }
}
exports.default = PropertyFilter;
;
//# sourceMappingURL=property_filter.js.map