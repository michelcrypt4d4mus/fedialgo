"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairTag = void 0;
const api_1 = require("../../api/api");
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
    if (api_1.MastoApi.instance) {
        tag.url = api_1.MastoApi.instance.tagURL(tag);
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