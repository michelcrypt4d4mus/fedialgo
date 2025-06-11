"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../helpers/logger");
const collection_helpers_1 = require("../helpers/collection_helpers");
;
/**
 * Abstract base class representing a filter that can be applied to a Toot to determine
 * if it should be included in the timeline feed. Subclasses must implement the isAllowed method.
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
     * @param {FilterArgs} params - The arguments for configuring the filter.
     * @param {string} [params.description] - Optional description of the filter for display or documentation purposes.
     * @param {boolean} [params.invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
     * @param {FilterTitle} params.title - The title or key identifying this filter (e.g., a BooleanFilterName or Toot property).
     */
    constructor(params) {
        const { description, invertSelection, title } = params;
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
    /** Must be overridden in subclasses. */
    static isValidTitle(name) {
        throw new Error("isValidTitle() must be implemented in subclasses");
    }
    /**
     * Remove any filter args from the list whose title is invalid
     * @param {FilterArgs[]} args - The list of filter arguments to check.
     * @param {Logger} logger - Logger instance to log warnings for invalid args.
     * @returns {FilterArgs[]} The filtered list containing only valid filter arguments.
     */
    static removeInvalidFilterArgs(args, logger) {
        const [validArgs, invalidArgs] = (0, collection_helpers_1.split)(args, arg => this.isValidTitle(arg.title));
        if (invalidArgs.length > 0) {
            logger.warn(`Found invalid filter args [${invalidArgs.map(a => a.title)}]...`);
        }
        else {
            logger.trace("All filter args are valid.");
        }
        return validArgs;
    }
}
exports.default = TootFilter;
;
//# sourceMappingURL=toot_filter.js.map