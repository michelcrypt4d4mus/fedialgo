"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagInfoStr = exports.repairTag = exports.isValidForSubstringSearch = void 0;
/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
const api_1 = __importDefault(require("../../api/api"));
const config_1 = require("../../config");
const language_helper_1 = require("../../helpers/language_helper");
const string_helpers_1 = require("../../helpers/string_helpers");
const BROKEN_TAG = "<<BROKEN_TAG>>";
/** Returns true for hashtags that can count as existing in a Toot even if the "#" character wasn't used. */
function isValidForSubstringSearch(tag) {
    return (tag.name.length > 1 && !config_1.config.toots.tagOnlyStrings.has(tag.name));
}
exports.isValidForSubstringSearch = isValidForSubstringSearch;
;
/** Lowercase the tag name, replace URL with one on homeserver. */
function repairTag(tag) {
    const language = (0, language_helper_1.detectForeignScriptLanguage)(tag.name);
    if (language)
        tag.language = language; // Don't set 'language' prop unnecessarily for space reasons
    if (!tag.name?.length) {
        console.warn(`Broken tag object:`, tag);
        tag.name = BROKEN_TAG;
    }
    else if (!language) {
        // If it's not a non-Latin language tag remove diacritics // TODO: should we remove diacritics?
        tag.name = (0, string_helpers_1.removeDiacritics)(tag.name.toLowerCase());
    }
    if (api_1.default.instance) {
        tag.url = api_1.default.instance.tagUrl(tag);
    }
    else {
        console.warn(`MastoApi.instance is null!`);
        tag.url = tag.url.toLowerCase() || "";
    }
    return tag;
}
exports.repairTag = repairTag;
;
/** Create a string representation of the tag with its usage counts & language. */
function tagInfoStr(tag) {
    const infoStr = `${tag.numToots} numToots${(0, string_helpers_1.optionalSuffix)(tag.language)}`;
    return `${tag.name} (${infoStr})`;
}
exports.tagInfoStr = tagInfoStr;
;
//# sourceMappingURL=tag.js.map