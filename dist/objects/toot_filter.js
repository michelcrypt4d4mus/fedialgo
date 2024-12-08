"use strict";
/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language).
 */
Object.defineProperty(exports, "__esModule", { value: true });
class TootFilter {
    title;
    description;
    invertSelection;
    visible = true; // true if the filter should be returned via TheAlgorithm.getFilters()
    constructor({ description, invertSelection, title, visible }) {
        this.description = description ?? title;
        this.invertSelection = invertSelection ?? false;
        this.title = title;
        this.visible = visible ?? true;
    }
    // Override in subclasses. Return true if the toot should appear in the timeline feed
    isAllowed(toot) {
        throw new Error("Method not implemented.");
    }
    // Override in subclasses. Required for serialization to local storage
    toArgs() {
        throw new Error("Method not implemented.");
    }
}
exports.default = TootFilter;
;
//# sourceMappingURL=toot_filter.js.map