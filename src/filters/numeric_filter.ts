/*
 * Put a minimum number on things like reblogs and replies.
 */
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { FilterArgs, ScoreName, WeightName } from "../types";

export const FILTERABLE_SCORES = [
    ScoreName.NUM_REPLIES,
    ScoreName.NUM_RETOOTS,
    ScoreName.NUM_FAVOURITES,
];

export const isNumericFilterName = (name: string) => FILTERABLE_SCORES.includes(name as ScoreName);

export interface NumericFilterArgs extends FilterArgs {
    value?: number;
};


export default class NumericFilter extends TootFilter {
    title: ScoreName;
    value: number;

    constructor({ invertSelection, title, value }: NumericFilterArgs) {
        const titleStr = title as string;

        super({
            description: `Minimum ${titleStr.startsWith("Num") ? titleStr.slice(3) : title}`,
            invertSelection,
            title,
        })

        this.title = title as ScoreName;
        this.value = value ?? 0;
    }

    // Return true if the toot should appear in the timeline feed
    isAllowed(toot: Toot): boolean {
        if (this.invertSelection && this.value === 0) return true;  // 0 doesn't work as a maximum
        const tootValue = toot.getIndividualScore("raw", this.title);

        if (!tootValue && tootValue !== 0) {
            let msg = `No value found for ${this.title} (probably interrupted scoring) in toot: ${toot.describe()}`;
            console.warn(msg);
            // isDebugMode ? console.warn(msg, toot) : console.warn(`${msg} ${toot.describe()}`);
            return true;
        }

        const isOK = tootValue >= this.value;
        return this.invertSelection ? !isOK : isOK;
    }

    // Update the value of the filter
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
