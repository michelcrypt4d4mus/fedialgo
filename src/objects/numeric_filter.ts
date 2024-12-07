/*
 * Put a minimum number on things like reblogs and replies.
 */
import { Toot } from "../types";

import { FilterArgs } from "./feed_filter_section";
import { WeightName } from "../types";

export interface NumericFilterArgs extends FilterArgs {
    value?: number;
};

export const NUMERIC_FILTER_WEIGHTS: WeightName[] = [
    WeightName.NUM_REPLIES,
    WeightName.NUM_RETOOTS,
    WeightName.NUM_FAVOURITES,
];


export default class NumericFilter {
    description: string;
    invertSelection: boolean;
    title: WeightName;
    value: number;

    constructor({ invertSelection, title, value }: NumericFilterArgs) {
        this.title = title as WeightName;
        this.description = title;
        if (this.description.startsWith("Num")) this.description = this.description.slice(3);
        this.description = `Minimum ${this.description}`;
        this.invertSelection = invertSelection ?? false;
        this.value = value ?? 0;
    }

    // Return true if the toot should appear in the timeline feed
    isAllowed(toot: Toot): boolean {
        return (toot.scoreInfo?.rawScores?.[this.title] || 0) >= this.value;
    }

    // Add the element to the filters array if it's not already there or remove it if it is
    updateValue(newValue: number): void {
        console.debug(`Updating value for ${this.title} with ${newValue}`);
        this.value = newValue;
    }

    // Required for serialization of settings to local storage
    toArgs(): NumericFilterArgs {
        return {
            invertSelection: this.invertSelection,
            title: this.title,
            value: this.value
        };
    }
};
