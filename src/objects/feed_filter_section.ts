/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language).
 */
import Storage from "../Storage";
import { FilterArgs, Toot } from "../types";

type FilterOptionInfo = Record<string, number>;  // e.g. { 'en': 10, 'de': 5 }
type SourceFilter = (toot: Toot) => boolean;
type SourceFilters = Record<SourceFilterName, SourceFilter>;
type TootMatcher = (toot: Toot, validValues: string[]) => boolean;
type TootMatchers = Record<FilterOptionName, TootMatcher>;


// This is the order the filters will appear in the UI in the demo app
export enum FilterOptionName {
    SOURCE = 'source',
    LANGUAGE = 'language',
    HASHTAG = 'hashtag',
    USER = 'user',
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


export const SOURCE_FILTERS: SourceFilters = {
    [SourceFilterName.FOLLOWED_ACCOUNTS]: (toot) => !!toot.isFollowed,
    [SourceFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.followedTags?.length,
    [SourceFilterName.LINKS]:             (toot) => !!(toot.card || toot.reblog?.card),
    [SourceFilterName.REPLIES]:           (toot) => !!toot.inReplyToId,
    [SourceFilterName.REPOSTS]:           (toot) => !!toot.reblog,
    [SourceFilterName.TRENDING_HASHTAGS]: (toot) => !!toot.trendingTags?.length,
    [SourceFilterName.TRENDING_TOOTS]:    (toot) => !!toot.trendingRank,
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
    [FilterOptionName.USER]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.account.acct);
    },
};

export interface FeedFilterSectionArgs extends FilterArgs{
    optionInfo?: FilterOptionInfo;  // e.g. counts of toots with this option
    validValues?: string[];
};

const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";


export default class FeedFilterSection {
    title: FilterOptionName;
    description: string;
    invertSelection: boolean;
    optionInfo: FilterOptionInfo;
    validValues: string[];

    constructor({ title, invertSelection, optionInfo, validValues }: FeedFilterSectionArgs) {
        this.title = title as FilterOptionName;

        if (this.title == FilterOptionName.SOURCE) {
            // Set up the default for source filters so something always shows up in the options
            this.optionInfo = Object.values(SourceFilterName).reduce((acc, option) => {
                acc[option] = 1;
                return acc;
            }, {} as FilterOptionInfo);

            this.description = SOURCE_FILTER_DESCRIPTION;
        } else {
            const descriptionWord = title == FilterOptionName.HASHTAG ? "including" : "from";
            this.description = `Show only toots ${descriptionWord} these ${title}s`;
        }

        this.invertSelection = invertSelection ?? false;
        this.optionInfo = optionInfo ?? {};
        this.validValues = validValues ?? [];
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
            invertSelection: this.invertSelection,
            optionInfo: this.optionInfo,
            title: this.title,
            validValues: this.validValues,
        };
    }
};
