"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairTag = void 0;
/*
 * Helper methods for dealing with Mastodon's Tag objects.
 * API docs: https://docs.joinmastodon.org/entities/Tag/
 */
const api_1 = __importDefault(require("../../api/api"));
const BROKEN_TAG = "<<BROKEN_TAG>>";
// Lowercase the tag name, replace URL with one on homeserver
function repairTag(tag) {
    if (!tag.name?.length) {
        console.warn(`Broken tag object:`, tag);
        tag.name = BROKEN_TAG;
    }
    else {
        tag.name = tag.name.toLowerCase();
    }
    if (api_1.default.instance) {
        tag.url = api_1.default.instance.tagURL(tag);
    }
    else {
        console.warn(`MastoApi.instance is null!`);
        tag.url = tag.url.toLowerCase() || "";
    }
    return tag;
}
exports.repairTag = repairTag;
;
//# sourceMappingURL=tag.js.map