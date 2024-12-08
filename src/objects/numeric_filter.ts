/*
 * Put a minimum number on things like reblogs and replies.
 */
import TootFilter from "./toot_filter";
import { FilterArgs } from "../types";
import { Toot, WeightName } from "../types";

export interface NumericFilterArgs extends FilterArgs {
    value?: number;
};

export const FILTERABLE_SCORES: WeightName[] = [
    WeightName.NUM_REPLIES,
    WeightName.NUM_RETOOTS,
    WeightName.NUM_FAVOURITES,
];


export default class NumericFilter extends TootFilter {
    title: WeightName;
    value: number;

    constructor({ invertSelection, title, value }: NumericFilterArgs) {
        super({
            description: `Minimum ${title.startsWith("Num") ? title.slice(3) : title}`,
            invertSelection,
            title,
        })

        this.title = title as WeightName;
        this.value = value ?? 0;
    }

    // Return true if the toot should appear in the timeline feed
    isAllowed(toot: Toot): boolean {
        const tootValue = toot.scoreInfo?.rawScores?.[this.title];
        if (this.invertSelection && this.value === 0) return true;  // 0 doesn't work as a maximum

        if (!tootValue && tootValue !== 0) {
            console.warn(`No value found for ${this.title} in toot:`, toot);
            return true;
        }

        const isOK = (toot.scoreInfo?.rawScores?.[this.title] || 0) >= this.value;
        return this.invertSelection ? !isOK : isOK;
    }

    // Add the element to the filters array if it's not already there or remove it if it is
    updateValue(newValue: number): void {
        this.value = newValue;
    }

    // Required for serialization of settings to local storage
    toArgs(): NumericFilterArgs {
        const filterArgs = super.toArgs() as NumericFilterArgs;
        filterArgs.value = this.value;
        return filterArgs;
    }
};
