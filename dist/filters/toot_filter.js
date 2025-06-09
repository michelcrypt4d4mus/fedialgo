"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../helpers/logger");
/**
 * Abstract base class representing a filter that can be applied to a Toot to determine
 * if it should be included in the timeline feed. Subclasses must implement the isAllowed method.
 * @abstract
 * @property {string} description - Description of the filter for display or documentation purposes.
 * @property {boolean} invertSelection - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {Logger} logger - Logger instance for this filter.
 * @property {FilterTitle} title - The title or key identifying this filter (e.g., a boolean filter name or toot property).
 */
class TootFilter {
    description;
    invertSelection;
    logger;
    title;
    /**
     * Constructs a TootFilter.
     * @param {FilterArgs} param0 - The arguments for configuring the filter.
     * @param {string} [param0.description] - Optional description of the filter.
     * @param {boolean} [param0.invertSelection] - Whether to invert the filter logic.
     * @param {FilterTitle} param0.title - The title or key for this filter.
     */
    constructor({ description, invertSelection, title }) {
        this.description = description ?? title;
        this.invertSelection = invertSelection ?? false;
        this.title = title;
        this.logger = logger_1.Logger.withParenthesizedName("TootFilter", title);
    }
    /**
     * Returns the arguments needed to reconstruct this filter. Extend in subclasses for serialization.
     * @returns {FilterArgs} The arguments representing this filter's configuration.
     */
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