"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagStr = exports.repairTag = exports.buildTagNames = void 0;
/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
const api_1 = __importDefault(require("../../api/api"));
const language_helper_1 = require("../../helpers/language_helper");
const string_helpers_1 = require("../../helpers/string_helpers");
const BROKEN_TAG = "<<BROKEN_TAG>>";
// Build a lookup table of tag names to tag objects
function buildTagNames(tags) {
    return tags.reduce((tagNames, tag) => {
        tagNames[tag.name];
        return tagNames;
    }, {});
}
exports.buildTagNames = buildTagNames;
;
// Lowercase the tag name, replace URL with one on homeserver
function repairTag(tag) {
    const language = (0, language_helper_1.detectHashtagLanguage)(tag.name);
    if (language)
        tag.language = language; // Don't set unnecessarily for storage space reasons
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
const tagStr = (tag) => `${tag.name} (${tag.numToots} numToots, language: ${tag.language})`;
exports.tagStr = tagStr;
//# sourceMappingURL=tag.js.map