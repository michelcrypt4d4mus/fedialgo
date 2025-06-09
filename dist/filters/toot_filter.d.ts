/**
 * TootFilter is an abstract class that represents a filter that can be applied
 * to a Toot to determine if it should be included in the timeline feed.
 */
import Toot from '../api/objects/toot';
import { Logger } from '../helpers/logger';
import { type FilterTitle } from "../types";
export interface FilterArgs {
    description?: string;
    invertSelection?: boolean;
    title: FilterTitle;
}
/**
 * Abstract base class representing a filter that can be applied to a Toot to determine
 * if it should be included in the timeline feed. Subclasses must implement the isAllowed method.
 * @class
 * @property {string} description - Description of the filter for display or documentation purposes.
 * @property {boolean} invertSelection - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {Logger} logger - Logger instance for this filter.
 * @property {FilterTitle} title - The title or key identifying this filter (e.g., a boolean filter name or toot property).
 */
export default abstract class TootFilter {
    description: string;
    invertSelection: boolean;
    logger: Logger;
    title: FilterTitle;
    /**
     * @param {FilterArgs} params - The arguments for configuring the filter.
     * @param {string} [params.description] - Optional description of the filter for display or documentation purposes.
     * @param {boolean} [params.invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
     * @param {FilterTitle} params.title - The title or key identifying this filter (e.g., a BooleanFilterName or Toot property).
     */
    constructor(params: FilterArgs);
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
    toArgs(): FilterArgs;
    /** Must be overridden in subclasses. */
    static isValidTitle(name: string): boolean;
    /** Remove any filter args from the list whose title is invalid */
    static removeInvalidFilterArgs(args: FilterArgs[], logger: Logger): FilterArgs[];
}
