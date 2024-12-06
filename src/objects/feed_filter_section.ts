/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language).
 */
import Storage from "../Storage";
import { Toot } from "../types";

// This is the order the filters will appear in the UI in the demo app
export enum FilterOptionName {
    SOURCE = 'source',
    LANGUAGE = 'language',
    HASHTAG = 'hashtag',
    APP = 'app',
};

export enum SourceFilterName {
    FOLLOWED_ACCOUNTS = 'followedAccounts',
    FOLLOWED_HASHTAGS = 'followedHashtags',
    LINKS = 'links',
    REPLIES = 'replies',
    REPOSTS = 'reposts',
    TRENDING_HASHTAGS = 'trendingHashtags',
    TRENDING_TOOTS = 'trendingToots',
};

type FilterOption = Record<string, boolean>;     // e.g. { 'en': false, 'de': true }
type FilterOptionInfo = Record<string, number>;  // e.g. { 'en': 10, 'de': 5 }
type SourceFilter = (toot: Toot) => boolean;
type SourceFilters = Record<SourceFilterName, SourceFilter>;
type TootMatcher = (toot: Toot, validValues: string[]) => boolean;
type TootMatchers = Record<FilterOptionName, TootMatcher>;


export const SOURCE_FILTERS: SourceFilters = {
    [SourceFilterName.LINKS]: (toot) => !!(toot.card || toot.reblog?.card),
    [SourceFilterName.FOLLOWED_ACCOUNTS]: (toot) => !!toot.isFollowed,
    [SourceFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.followedTags?.length,
    [SourceFilterName.REPLIES]: (toot) => !!toot.inReplyToId,
    [SourceFilterName.REPOSTS]: (toot) => !!toot.reblog,
    [SourceFilterName.TRENDING_HASHTAGS]: (toot) => !!toot.trendingTags?.length,
    [SourceFilterName.TRENDING_TOOTS]: (toot) => !!toot.trendingRank,
};

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
    [FilterOptionName.SOURCE]: (toot: Toot, validValues: string[]) => {
        return Object.entries(SOURCE_FILTERS).some(([filterName, filter]) => {
            return validValues.includes(filterName) && filter(toot);
        });
    },
};


export interface FeedFilterSectionArgs {
    title: FilterOptionName;
    invertSelection?: boolean;
    // TODO: sucks to have options and optionInfo be separate when they're so closely related
    options?: FilterOption;
    optionInfo?: FilterOptionInfo;  // e.g. counts of toots with this option
    validValues?: string[];
};

const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";


export default class FeedFilterSection {
    title: FilterOptionName;
    description: string;
    invertSelection: boolean;
    options: FilterOption;
    optionInfo: FilterOptionInfo;
    validValues: string[];

    constructor({ title, invertSelection, options, optionInfo, validValues }: FeedFilterSectionArgs) {
        this.title = title;

        if (this.title == FilterOptionName.SOURCE) {
            this.options = Object.values(SourceFilterName).reduce((acc, option) => {
                acc[option] = false;
                return acc;
            }, {} as FilterOption);

            this.description = SOURCE_FILTER_DESCRIPTION;
        } else {
            this.options = options ?? {};
            const descriptionWord = title == FilterOptionName.HASHTAG ? "including" : "from";
            this.description = `Show only toots ${descriptionWord} these ${title}s`;
        }

        this.invertSelection = invertSelection ?? false;
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

    // Required for serialization of settings to local storage
    toArgs(): FeedFilterSectionArgs {
        return {
            title: this.title,
            validValues: this.validValues,
            invertSelection: this.invertSelection,
            options: this.options,
            optionInfo: this.optionInfo,
        };
    }
};
