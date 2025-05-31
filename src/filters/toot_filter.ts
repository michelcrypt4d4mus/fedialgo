/*
 * TootFilter is an abstract class that represents a filter that can be applied
 * to a Toot to determine if it should be included in the timeline feed.
 */
import Toot from '../api/objects/toot';
import { ComponentLogger } from '../helpers/logger';
import { type FilterArgs, type FilterTitle } from "../types";


export default abstract class TootFilter {
    description: string;
    invertSelection: boolean;
    logger: ComponentLogger;
    title: FilterTitle;
    visible: boolean = true;  // true if the filter should be returned via TheAlgorithm.getFilters()

    constructor({ description, invertSelection, title, visible }: FilterArgs) {
        this.description = description ?? title as string;
        this.invertSelection = invertSelection ?? false;
        this.title = title;
        this.visible = visible ?? true;
        this.logger = new ComponentLogger("TootFilter", this.constructor.name, title);
    }

    // Return true if the toot should appear in the timeline feed
    abstract isAllowed(toot: Toot): boolean;

    // Extend in subclasses. Required for serialization to local storage
    toArgs(): FilterArgs {
        return {
            invertSelection: this.invertSelection,
            title: this.title,
            visible: this.visible
        };
    }
};
