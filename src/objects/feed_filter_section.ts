/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language).
 */
import Storage from "../Storage";
import { Toot } from "../types";


// This is the order the filters will appear in the UI in the demo app
export enum FilterOptionName {
    LANGUAGE = 'language',
    HASHTAG = 'hashtag',
    APP = 'app',
};

type FilterOption = Record<string, boolean>;     // e.g. { 'en': false, 'de': true }
type FilterOptionInfo = Record<string, number>;  // e.g. { 'en': 10, 'de': 5 }
type TootMatcher = (toot: Toot, validValues: string[]) => boolean;
type TootMatchers = Record<FilterOptionName, TootMatcher>;

const TOOT_MATCHERS: TootMatchers = {
    [FilterOptionName.APP]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.application?.name);
    },
    [FilterOptionName.LANGUAGE]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.language || Storage.getConfig().defaultLanguage);
    },
    [FilterOptionName.HASHTAG]: (toot: Toot, validValues: string[]) => {
        return toot.tags.some(tag => validValues.includes(tag.name));
    },
};


export interface FeedFilterSectionArgs {
    title: FilterOptionName;
    description?: string;
    invertSelection?: boolean;
    // TODO: sucks to have options and optionInfo be separate when they're so closely related
    options?: FilterOption;
    optionInfo?: FilterOptionInfo;  // e.g. counts of toots with this option
    validValues?: string[];
};


export default class FeedFilterSection {
    title: FilterOptionName;
    description: string;
    invertSelection: boolean;
    options: FilterOption;
    optionInfo: FilterOptionInfo;
    validValues: string[];

    constructor({ title, description, invertSelection, options, optionInfo, validValues }: FeedFilterSectionArgs) {
        this.title = title;
        const descriptionWord = title == FilterOptionName.HASHTAG ? "including" : "from";
        this.description = description ?? `Show only toots ${descriptionWord} these ${title}s`;
        this.invertSelection = invertSelection ?? false;
        this.options = options ?? {};
        this.optionInfo = optionInfo ?? {};
        this.validValues = validValues ?? [];
    }

    // alternate constructor
    static createForOptions(title: FilterOptionName, options: string[]): FeedFilterSection {
        const section = new FeedFilterSection({ title });
        section.setOptions(options);
        return section;
    }

    // Add a list of strings as options that are all set to false
    setOptions(options: string[]) {
        this.options = options.reduce((acc, option) => {
            acc[option] = false;
            return acc;
        }, {} as FilterOption);
    }

    // Add a dict of option info (keys will be set as options that are all set to false)
    setOptionsWithInfo(optionInfo: FilterOptionInfo) {
        this.optionInfo = optionInfo;

        this.options = Object.keys(optionInfo).reduce((acc, option) => {
            acc[option] = false;
            return acc;
        }, {} as FilterOption);
    }

    // Return true if the toot should appear in the timeline feed
    isAllowed(toot: Toot): boolean {
        if (this.validValues.length === 0) return true;  // if there's no validValues allow everything
        const isMatched = TOOT_MATCHERS[this.title](toot, this.validValues);
        return this.invertSelection ? !isMatched : isMatched;
    }

    // Add the element to the filters array if it's not already there or remove it if it is
    updateValidOptions(element: string, isValidOption: boolean) {
        console.debug(`Updating options for ${this.title} with ${element} and ${isValidOption}`);

        if (isValidOption) {
            this.validValues.push(element);  // TODO: maybe check that it's not already there to avoid concurrency issues?
        } else {
            this.validValues.splice(this.validValues.indexOf(element), 1);
        }
    }

    toArgs(): FeedFilterSectionArgs {
        return {
            title: this.title,
            description: this.description,
            validValues: this.validValues,
            invertSelection: this.invertSelection,
            options: this.options,
        };
    }
};
