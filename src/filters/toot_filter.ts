/**
 * TootFilter is an abstract class that represents a filter that can be applied
 * to a Toot to determine if it should be included in the timeline feed.
 */
import Toot from '../api/objects/toot';
import { Logger } from '../helpers/logger';
import { split } from '../helpers/collection_helpers';
import { type FilterProperty } from "../types";

export interface FilterArgs {
    description?: string;
    invertSelection?: boolean;
    propertyName: FilterProperty;
};


/**
 * Abstract base class representing a filter that can be applied to a Toot to determine
 * if it should be included in the timeline feed. Subclasses must implement the isAllowed method.
 * @property {string} description - Description of the filter for display or documentation purposes.
 * @property {boolean} invertSelection - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {Logger} logger - Logger instance for this filter.
 * @property {FilterProperty} propertyName - The property this filter works on
 */
export default abstract class TootFilter {
    description: string;
    invertSelection: boolean;
    logger: Logger;
    propertyName: FilterProperty;

    /**
     * @param {FilterArgs} params - The arguments for configuring the filter.
     * @param {string} [params.description] - Optional description of the filter for display or documentation purposes.
     * @param {boolean} [params.invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
     * @param {FilterProperty} params.propertyName - Key identifying what this filter is filtering on.
     */
    constructor(params: FilterArgs) {
        const { description, invertSelection, propertyName } = params
        this.description = description ?? propertyName as string;
        this.invertSelection = invertSelection ?? false;
        this.propertyName = propertyName;
        this.logger = Logger.withParenthesizedName("TootFilter", propertyName);
    }

    /**
     * Determines if the given toot should appear in the timeline feed.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean} True if the toot is allowed, false otherwise.
     */
    abstract isAllowed(toot: Toot): boolean;

    /**
     * Returns the arguments needed to reconstruct this filter. Extend in subclasses for serialization.
     * @returns {FilterArgs} The arguments representing this filter's configuration.
     */
    toArgs(): FilterArgs {
        return {
            invertSelection: this.invertSelection,
            propertyName: this.propertyName,
        };
    }

    /** Must be overridden in subclasses. */
    static isValidFilterProperty(name: string): boolean {
        throw new Error("isValidFilterProperty() must be implemented in subclasses");
    }

    /** Remove any filter args from the list whose propertyName is invalid */
    static removeInvalidFilterArgs(args: FilterArgs[], logger: Logger): FilterArgs[] {
        const [validArgs, invalidArgs] = split(args, arg => this.isValidFilterProperty(arg.propertyName));

        if (invalidArgs.length > 0) {
            logger.warn(`Found invalid filter args [${invalidArgs.map(a => a.propertyName)}]...`);
        } else {
            logger.trace("All filter args are valid.");
        }

        return validArgs;
    }
};
