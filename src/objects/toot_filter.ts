/*
 * TootFilter is an abstract class that represents a filter that can be applied
 * to a Toot to determine if it should be included in the timeline feed.
 */
import { FilterArgs, FilterTitle, Toot } from "../types";
import { PropertyName } from "./property_filter";


export default class TootFilter {
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

    // Override in subclasses. Return true if the toot should appear in the timeline feed
    isAllowed(toot: Toot): boolean {
        throw new Error("Method not implemented.");
    }

    // Extend in subclasses. Required for serialization to local storage
    toArgs(): FilterArgs {
        return {
            invertSelection: this.invertSelection,
            title: this.title,
            visible: this.visible
        };
    }
};
