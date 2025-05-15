/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 */
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { Config } from '../config';
import { countValues } from "../helpers/collection_helpers";
import { FilterArgs, StorageKey, StringNumberDict } from "../types";

type TypeFilter = (toot: Toot) => boolean;
type TypeFilters = Record<TypeFilterName, TypeFilter>;
type TootMatcher = (toot: Toot, validValues: string[]) => boolean;
type TootMatchers = Record<BooleanFilterName, TootMatcher>;

const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";

// This is the order the filters will appear in the UI in the demo app
export enum BooleanFilterName {
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
    AUDIO = 'audio',
    DIRECT_MESSAGE = 'directMessages',
    FOLLOWED_ACCOUNTS = 'followedAccounts',
    FOLLOWED_HASHTAGS = 'followedHashtags',
    IMAGES = 'images',
    LINKS = 'links',
    MENTIONS = 'mentions',
    POLLS = 'polls',
    PARTICIPATED_HASHTAGS = 'participatedHashtags',
    REPLIES = 'replies',
    RETOOTS = 'retoots',
    SENSITIVE = 'sensitive',
    SPOILERED = 'spoilered',
    TRENDING_HASHTAGS = 'trendingHashtags',
    TRENDING_LINKS = 'trendingLinks',
    TRENDING_TOOTS = 'trendingToots',
    VIDEOS = 'videos',
};

// Defining a new filter just requires adding a new entry to TYPE_FILTERS
export const TYPE_FILTERS: TypeFilters = {
    [TypeFilterName.AUDIO]:                 (toot) => !!toot.realToot().audioAttachments.length,
    [TypeFilterName.DIRECT_MESSAGE]:        (toot) => toot.isDM(),
    [TypeFilterName.FOLLOWED_ACCOUNTS]:     (toot) => !!(toot.account.isFollowed || toot.reblog?.account.isFollowed),
    [TypeFilterName.FOLLOWED_HASHTAGS]:     (toot) => !!toot.realToot().followedTags?.length,
    [TypeFilterName.IMAGES]:                (toot) => !!toot.realToot().imageAttachments.length,
    [TypeFilterName.LINKS]:                 (toot) => !!(toot.realToot().card || toot.realToot().trendingLinks?.length),
    [TypeFilterName.MENTIONS]:              (toot) => toot.containsUserMention(),
    [TypeFilterName.POLLS]:                 (toot) => !!toot.realToot().poll,
    [TypeFilterName.PARTICIPATED_HASHTAGS]: (toot) => !!toot.realToot().participatedTags?.length,
    [TypeFilterName.REPLIES]:               (toot) => !!toot.realToot().inReplyToId,
    [TypeFilterName.RETOOTS]:               (toot) => !!toot.reblog,
    [TypeFilterName.SENSITIVE]:             (toot) => !!toot.realToot().sensitive,
    [TypeFilterName.SPOILERED]:             (toot) => !!toot.realToot().spoilerText,
    [TypeFilterName.TRENDING_HASHTAGS]:     (toot) => !!toot.realToot().trendingTags?.length,
    [TypeFilterName.TRENDING_LINKS]:        (toot) => !!toot.realToot().trendingLinks?.length,
    [TypeFilterName.TRENDING_TOOTS]:        (toot) => !!toot.realToot().trendingRank,
    [TypeFilterName.VIDEOS]:                (toot) => !!toot.realToot().videoAttachments.length,
};

// Defining a new filter category just requires adding a new entry to TYPE_FILTERS
const TOOT_MATCHERS: TootMatchers = {
    [BooleanFilterName.APP]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.realToot().application?.name);
    },
    [BooleanFilterName.LANGUAGE]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.realToot().language || Config.defaultLanguage);
    },
    [BooleanFilterName.HASHTAG]: (toot: Toot, validValues: string[]) => {
        return !!validValues.find((v) => toot.realToot().containsTag(v, true));
    },
    [BooleanFilterName.SERVER_SIDE_FILTERS]: (toot: Toot, validValues: string[]) => {
        return !!validValues.find((v) => toot.realToot().containsTag(v, true));
    },
    [BooleanFilterName.TYPE]: (toot: Toot, validValues: string[]) => {
        return Object.entries(TYPE_FILTERS).some(([filterName, filter]) => {
            return validValues.includes(filterName) && filter(toot);
        });
    },
    [BooleanFilterName.USER]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.realToot().account.webfingerURI);
    },
};

export interface BooleanFilterArgs extends FilterArgs {
    optionInfo?: StringNumberDict;  // e.g. counts of toots with this option
    validValues?: string[];
};


export default class BooleanFilter extends TootFilter {
    title: BooleanFilterName
    optionInfo: StringNumberDict;
    effectiveOptionInfo: StringNumberDict = {};  // optionInfo with the counts of toots that match the filter
    validValues: string[];
    visible: boolean = true;  // true if the filter should be returned via TheAlgorithm.getFilters()

    constructor({ title, invertSelection, optionInfo, validValues }: BooleanFilterArgs) {
        optionInfo ??= {};
        let description: string;

        if (title == BooleanFilterName.TYPE) {
            // Set up the default for type filters so something always shows up in the options
            optionInfo = countValues<TypeFilterName>(Object.values(TypeFilterName));
            description = SOURCE_FILTER_DESCRIPTION;
        } else {
            const descriptionWord = title == BooleanFilterName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${title}s`;
        }

        super({ description, invertSelection, title });
        this.title = title as BooleanFilterName
        this.optionInfo = optionInfo ?? {};
        this.validValues = validValues ?? [];

        // Server side filters are invisible & inverted by default bc we don't want to show toots including them
        if (title == BooleanFilterName.SERVER_SIDE_FILTERS) {
            this.invertSelection = invertSelection ?? true;
            this.visible = false;
        } else if (this.title == BooleanFilterName.APP) {
            this.visible = Config.isAppFilterVisible;
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
        this.optionInfo = {...optionInfo}; // TODO: this is to trigger useMemo() in the demo app, not great
        // Filter out any options that are no longer valid
        this.validValues = this.validValues.filter((v) => v in optionInfo);

        // Server side filters get all the options immediately set to filter out toots that come
        // from trending and other sources where the user's server configuration is not applied.
        if (this.title == BooleanFilterName.SERVER_SIDE_FILTERS) {
            this.validValues = Object.keys(optionInfo);
        }
    }

    // Add the element to the filters array if it's not already there or remove it if it is
    // If isValidOption is false remove the element from the filter instead of adding it
    updateValidOptions(element: string, isValidOption: boolean) {
        console.debug(`Updating options for ${this.title} with ${element} and ${isValidOption}`);

        if (isValidOption) {
            this.validValues.push(element);
        } else {
            if (!this.validValues.includes(element)) {
                console.warn(`Tried to remove ${element} from ${this.title} but it wasn't there`);
                return;
            }

            this.validValues.splice(this.validValues.indexOf(element), 1);
        }

        // Remove duplicates; build new Array object to trigger useMemo() in Demo App // TODO: not great
        this.validValues = [...new Set(this.validValues)];
    }

    // Required for serialization of settings to local storage
    toArgs(): BooleanFilterArgs {
        const filterArgs = super.toArgs() as BooleanFilterArgs;
        filterArgs.validValues = this.validValues;
        return filterArgs;
    }
};
