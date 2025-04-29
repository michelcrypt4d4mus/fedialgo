"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairTag = void 0;
const BROKEN_TAG = "<<BROKEN_TAG>>";
// Lowercase the tag name and URL
function repairTag(tag) {
    if (!tag.name?.length) {
        console.warn(`Broken tag object:`, tag);
        tag.name = BROKEN_TAG;
    }
    else {
        tag.name = tag.name.toLowerCase();
    }
    tag.url = tag.url.toLowerCase();
    return tag;
}
exports.repairTag = repairTag;
;
//# sourceMappingURL=tag.js.map