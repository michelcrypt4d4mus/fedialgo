"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../helpers/logger");
const collection_helpers_1 = require("../helpers/collection_helpers");
;
/**
 * Abstract base class representing a filter that can be applied to a {@linkcode Toot} to determine
 * if it should be included in the timeline feed. Subclasses must implement the
 * {@linkcode TootFilter.isAllowed} method.
 * @property {string} description - Description of the filter for display or documentation purposes.
 * @property {boolean} invertSelection - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {Logger} logger - Logger instance for this filter.
 * @property {FilterProperty} propertyName - The property this filter works on
 */
class TootFilter {
    description;
    invertSelection;
    logger;
    propertyName;
    /**
     * @param {FilterArgs} params - The arguments for configuring the filter.
     * @param {string} [params.description] - Optional description of the filter for display or documentation purposes.
     * @param {boolean} [params.invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
     * @param {FilterProperty} params.propertyName - Key identifying what this filter is filtering on.
     */
    constructor(params) {
        const { description, invertSelection, propertyName } = params;
        this.description = description ?? propertyName;
        this.invertSelection = invertSelection ?? false;
        this.propertyName = propertyName;
        this.logger = logger_1.Logger.withParenthesizedName("TootFilter", propertyName);
    }
    /**
     * Returns the arguments needed to reconstruct this filter. Extend in subclasses for serialization.
     * @returns {FilterArgs} The arguments representing this filter's configuration.
     */
    toArgs() {
        return {
            invertSelection: this.invertSelection,
            propertyName: this.propertyName,
        };
    }
    /** Must be overridden in subclasses. */
    static isValidFilterProperty(_name) {
        throw new Error("isValidFilterProperty() must be implemented in subclasses");
    }
    /** Remove any filter args from the list whose propertyName is invalid */
    static removeInvalidFilterArgs(args, logger) {
        const [validArgs, invalidArgs] = (0, collection_helpers_1.split)(args, arg => this.isValidFilterProperty(arg.propertyName));
        if (invalidArgs.length > 0) {
            logger.warn(`Found invalid filter args [${invalidArgs.map(a => a.propertyName)}]...`);
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