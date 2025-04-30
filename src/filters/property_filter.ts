/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 */
import Storage from "../Storage";
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { countValues } from "../helpers/collection_helpers";
import { FilterArgs, StorageKey, StringNumberDict } from "../types";

type TypeFilter = (toot: Toot) => boolean;
type TypeFilters = Record<TypeFilterName, TypeFilter>;
type TootMatcher = (toot: Toot, validValues: string[]) => boolean;
type TootMatchers = Record<PropertyName, TootMatcher>;

const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";

// This is the order the filters will appear in the UI in the demo app
export enum PropertyName {
    TYPE = 'type',
    LANGUAGE = 'language',
    HASHTAG = 'hashtag',
    USER = 'user',
    APP = 'app',
    // Server Side filters work a bit differently. The API doesn't return toots that match the filter
    // for authenticated requests but for unauthenticated requests (e.g. pulling trending toots from
    // other servers) it does so we have to manually filter them out.
    SERVER_SIDE_FILTERS = StorageKey.SERVER_SIDE_FILTERS,
};

export enum TypeFilterName {
    DIRECT_MESSAGE = 'directMessages',
    FOLLOWED_ACCOUNTS = 'followedAccounts',
    FOLLOWED_HASHTAGS = 'followedHashtags',
    LINKS = 'links',
    MENTIONS = 'mentions',
    POLLS = 'polls',
    REPLIES = 'replies',
    REPOSTS = 'reposts',
    TRENDING_HASHTAGS = 'trendingHashtags',
    TRENDING_LINKS = 'trendingLinks',
    TRENDING_TOOTS = 'trendingToots',
};

export interface PropertyFilterArgs extends FilterArgs {
    optionInfo?: StringNumberDict;  // e.g. counts of toots with this option
    validValues?: string[];
};


export const TYPE_FILTERS: TypeFilters = {
    [TypeFilterName.DIRECT_MESSAGE]:    (toot) => toot.isDM(),
    [TypeFilterName.FOLLOWED_ACCOUNTS]: (toot) => !!toot.isFollowed,
    [TypeFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.followedTags?.length,
    [TypeFilterName.LINKS]:             (toot) => !!(toot.card || toot.reblog?.card || toot.trendingLinks?.length),
    // TODO: unclear if the MENTIONS filter works as expected
    [TypeFilterName.MENTIONS]:          (toot) => toot.containsUserMention(),
    [TypeFilterName.POLLS]:             (toot) => !!toot.poll,
    [TypeFilterName.REPLIES]:           (toot) => !!toot.inReplyToId,
    [TypeFilterName.REPOSTS]:           (toot) => !!toot.reblog,
    [TypeFilterName.TRENDING_HASHTAGS]: (toot) => !!toot.trendingTags?.length,
    [TypeFilterName.TRENDING_LINKS]:    (toot) => !!toot.trendingLinks?.length,
    [TypeFilterName.TRENDING_TOOTS]:    (toot) => !!toot.trendingRank,
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
    [PropertyName.TYPE]: (toot: Toot, validValues: string[]) => {
        return Object.entries(TYPE_FILTERS).some(([filterName, filter]) => {
            return validValues.includes(filterName) && filter(toot);
        });
    },
    [PropertyName.USER]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.account.webfingerURI);  // TODO maybe doesn't handle reblogs correctly
    },
};


export default class PropertyFilter extends TootFilter {
    title: PropertyName
    optionInfo: StringNumberDict;
    effectiveOptionInfo: StringNumberDict = {};  // optionInfo with the counts of toots that match the filter
    validValues: string[];
    visible: boolean = true;  // true if the filter should be returned via TheAlgorithm.getFilters()

    constructor({ title, invertSelection, optionInfo, validValues }: PropertyFilterArgs) {
        optionInfo ??= {};
        let description: string;

        if (title == PropertyName.TYPE) {
            // Set up the default for source filters so something always shows up in the options
            optionInfo = countValues<TypeFilterName>(Object.values(TypeFilterName));
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

    setOptions(optionInfo: StringNumberDict) {
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
