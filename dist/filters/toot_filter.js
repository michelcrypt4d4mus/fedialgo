"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TootFilter {
    description;
    invertSelection;
    title;
    visible = true; // true if the filter should be returned via TheAlgorithm.getFilters()
    constructor({ description, invertSelection, title, visible }) {
        this.description = description ?? title;
        this.invertSelection = invertSelection ?? false;
        this.title = title;
        this.visible = visible ?? true;
    }
    // Extend in subclasses. Required for serialization to local storage
    toArgs() {
        return {
            invertSelection: this.invertSelection,
            title: this.title,
            visible: this.visible
        };
    }
}
exports.default = TootFilter;
;
//# sourceMappingURL=toot_filter.js.map