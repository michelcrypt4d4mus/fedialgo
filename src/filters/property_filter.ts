/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language).
 */
import Storage, { Key } from "../Storage";
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { FilterArgs } from "../types";
import { transformKeys } from "../helpers";

type FilterOptionInfo = Record<string, number>;  // e.g. { 'en': 10, 'de': 5 }
type SourceFilter = (toot: Toot) => boolean;
type SourceFilters = Record<SourceFilterName, SourceFilter>;
type TootMatcher = (toot: Toot, validValues: string[]) => boolean;
type TootMatchers = Record<PropertyName, TootMatcher>;


// This is the order the filters will appear in the UI in the demo app
export enum PropertyName {
    SOURCE = 'source',
    LANGUAGE = 'language',
    HASHTAG = 'hashtag',
    USER = 'user',
    APP = 'app',
    // Server Side filters work a bit differently. The API doesn't return toots that match the filter
    // for authenticated requests but for unauthenticated requests (e.g. pulling trending toots from
    // other servers) it does so we have to manually filter them out.
    SERVER_SIDE_FILTERS = Key.SERVER_SIDE_FILTERS,
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

export interface PropertyFilterArgs extends FilterArgs {
    optionInfo?: FilterOptionInfo;  // e.g. counts of toots with this option
    validValues?: string[];
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
    [PropertyName.APP]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.application?.name);
    },
    [PropertyName.LANGUAGE]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.language || Storage.getConfig().defaultLanguage);
    },
    [PropertyName.HASHTAG]: (toot: Toot, validValues: string[]) => {
        return toot.tags.some(tag => validValues.includes(tag.name));
    },
    [PropertyName.SERVER_SIDE_FILTERS]: (toot: Toot, validValues: string[]) => {
        return !!validValues.find((v) => toot.containsString(v));
    },
    [PropertyName.SOURCE]: (toot: Toot, validValues: string[]) => {
        return Object.entries(SOURCE_FILTERS).some(([filterName, filter]) => {
            return validValues.includes(filterName) && filter(toot);
        });
    },
    [PropertyName.USER]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.account.acct);
    },
};

const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";


export default class PropertyFilter extends TootFilter {
    title: PropertyName
    optionInfo: FilterOptionInfo;
    validValues: string[];
    visible: boolean = true;  // true if the filter should be returned via TheAlgorithm.getFilters()

    constructor({ title, invertSelection, optionInfo, validValues }: PropertyFilterArgs) {
        optionInfo ??= {};
        let description: string;

        if (title == PropertyName.SOURCE) {
            // Set up the default for source filters so something always shows up in the options
            optionInfo = Object.values(SourceFilterName).reduce((acc, option) => {
                acc[option] = 1;
                return acc;
            }, {} as FilterOptionInfo);

            description = SOURCE_FILTER_DESCRIPTION;
        } else {
            const descriptionWord = title == PropertyName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${title}s`;
        }

        super({ description, invertSelection, title });
        this.title = title as PropertyName
        this.optionInfo = optionInfo ?? {};
        this.validValues = validValues ?? [];

        if (title == PropertyName.SERVER_SIDE_FILTERS) {
            // Server side filters are inverted by default bc we don't want to show toots including them
            this.invertSelection = invertSelection ?? true;
            this.visible = false;
        }
    }

    // Return true if the toot matches the filter
    isAllowed(toot: Toot): boolean {
        // If there's no validValues allow everything
        if (this.validValues.length === 0) return true;
        const isMatched = TOOT_MATCHERS[this.title](toot, this.validValues);
        return this.invertSelection ? !isMatched : isMatched;
    }

    setOptions(optionInfo: FilterOptionInfo) {
        this.optionInfo = optionInfo;

        // Server side filters get all the options immediately set to filter out toots
        if (this.title == PropertyName.SERVER_SIDE_FILTERS) {
            console.log(`Setting options for ${this.title} to:`, optionInfo);
            this.validValues = Object.keys(optionInfo);
        }
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
    toArgs(): PropertyFilterArgs {
        const filterArgs = super.toArgs() as PropertyFilterArgs;
        filterArgs.validValues = this.validValues;
        return filterArgs;
    }
};
