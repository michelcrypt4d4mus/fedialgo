/*
 * TootFilter is an abstract class that represents a filter that can be applied
 * to a Toot to determine if it should be included in the timeline feed.
 */
import Toot from '../api/objects/toot';
import { FilterArgs, FilterTitle} from "../types";
import { PropertyName } from "./property_filter";


export default abstract class TootFilter {
    description: string;
    invertSelection: boolean;
    title: FilterTitle;
    visible: boolean = true;  // true if the filter should be returned via TheAlgorithm.getFilters()

    constructor({ description, invertSelection, title, visible }: FilterArgs) {
        this.description = description ?? title as string;
        this.invertSelection = invertSelection ?? false;
        this.title = title as PropertyName;
        this.visible = visible ?? true;
    }

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
