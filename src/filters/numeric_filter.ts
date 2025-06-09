/*
 * Put a minimum number on things like reblogs and replies.
 */
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { type FilterArgs, type TootNumberProp } from "../types";

export const FILTERABLE_SCORES: TootNumberProp[] = [
    "repliesCount",
    "reblogsCount",
    "favouritesCount",
];

export const isNumericFilterName = (name: string) => FILTERABLE_SCORES.includes(name as TootNumberProp);

export interface NumericFilterArgs extends FilterArgs {
    value?: number;
};


export default class NumericFilter extends TootFilter {
    title: TootNumberProp;
    value: number;

    constructor({ invertSelection, title, value }: NumericFilterArgs) {
        const titleStr = title as string;

        super({
            description: `Minimum number of ${titleStr.replace(/Count$/, '')}`,
            invertSelection,
            title,
        })

        this.title = title as TootNumberProp;
        this.value = value ?? 0;
    }

    // Return true if the toot should appear in the timeline feed
    isAllowed(toot: Toot): boolean {
        if (this.invertSelection && this.value === 0) return true;  // 0 doesn't work as a maximum
        const propertyValue = toot.realToot[this.title];

        if (!propertyValue && propertyValue !== 0) {
            let msg = `No value found for ${this.title} (interrupted scoring?) in toot: ${toot.describe()}`;
            this.logger.warn(msg);
            // isDebugMode ? console.warn(msg, toot) : console.warn(`${msg} ${toot.describe()}`);
            return true;
        }

        const isOK = propertyValue >= this.value;
        return this.invertSelection ? !isOK : isOK;
    }

    // Required for serialization of settings to local storage
    toArgs(): NumericFilterArgs {
        const filterArgs = super.toArgs() as NumericFilterArgs;
        filterArgs.value = this.value;
        return filterArgs;
    }

    // Update the value of the filter
    updateValue(newValue: number): void {
        this.value = newValue;
    }
};
