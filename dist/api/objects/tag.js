"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairTag = void 0;
const BROKEN_TAG = "<<BROKEN_TAG>>";
// Lowercase the tag name and URL
function repairTag(tag) {
    tag.name = tag.name?.length ? tag.name.toLowerCase() : BROKEN_TAG;
    tag.url = tag.url.toLowerCase();
    return tag;
}
exports.repairTag = repairTag;
;
//# sourceMappingURL=tag.js.map