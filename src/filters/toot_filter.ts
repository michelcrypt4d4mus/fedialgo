/**
 * TootFilter is an abstract class that represents a filter that can be applied
 * to a Toot to determine if it should be included in the timeline feed.
 * @module Filters
 */
import Toot from '../api/objects/toot';
import { Logger } from '../helpers/logger';
import { type FilterArgs, type FilterTitle } from "../types";

/**
 * Abstract base class representing a filter that can be applied to a Toot to determine
 * if it should be included in the timeline feed. Subclasses must implement the isAllowed method.
 * @abstract
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
     * Constructs a TootFilter.
     * @param {FilterArgs} param0 - The arguments for configuring the filter.
     * @param {string} [param0.description] - Optional description of the filter.
     * @param {boolean} [param0.invertSelection] - Whether to invert the filter logic.
     * @param {FilterTitle} param0.title - The title or key for this filter.
     */
    constructor({ description, invertSelection, title }: FilterArgs) {
        this.description = description ?? title as string;
        this.invertSelection = invertSelection ?? false;
        this.title = title;
        this.logger = Logger.withParenthesizedName("TootFilter", title);
    }

    /**
     * Determines if the given toot should appear in the timeline feed.
     * @abstract
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
            title: this.title,
        };
    }
};
