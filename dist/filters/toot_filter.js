"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../helpers/logger");
class TootFilter {
    description;
    invertSelection;
    logger;
    title;
    constructor({ description, invertSelection, title }) {
        this.description = description ?? title;
        this.invertSelection = invertSelection ?? false;
        this.title = title;
        this.logger = logger_1.Logger.withParenthesizedName("TootFilter", title);
    }
    // Extend in subclasses. Required for serialization to local storage
    toArgs() {
        return {
            invertSelection: this.invertSelection,
            title: this.title,
        };
    }
}
exports.default = TootFilter;
;
//# sourceMappingURL=toot_filter.js.map