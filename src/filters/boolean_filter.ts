/**
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 * @module Filters
 */
import MastoApi from '../api/api';
import MastodonServer from '../api/mastodon_server';
import TagList from '../api/tag_list';
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { BooleanFilterName, ScoreName, TagTootsCacheKey, TypeFilterName } from '../enums';
import { BooleanFilterOptionList } from '../api/obj_with_counts_list';
import { compareStr } from '../helpers/string_helpers';
import { config } from '../config';
import { isValueInStringEnum } from "../helpers/collection_helpers";
import { type BooleanFilterOption, type FilterArgs, type FilterOptionDataSource } from "../types";

type FilterOptionDataSources = Record<FilterOptionDataSource, BooleanFilterOptionList | TagList>;
type TootMatcher = (toot: Toot, selectedOptions: string[]) => boolean;
type TypeFilter = (toot: Toot) => boolean;

const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";

export const isTypeFilterName = (value: string) => isValueInStringEnum(TypeFilterName)(value);


// Type-based filters for toots. Defining a new filter just requires adding a new TypeFilterName
// and a function that matches the toot.
export const TYPE_FILTERS: Record<TypeFilterName, TypeFilter> = {
    [TypeFilterName.AUDIO]:             (toot) => !!toot.realToot.audioAttachments?.length,
    [TypeFilterName.BOT]:               (toot) => !!(toot.account.bot || toot.reblog?.account.bot),
    [TypeFilterName.DIRECT_MESSAGE]:    (toot) => toot.isDM,
    [TypeFilterName.FOLLOWED_ACCOUNTS]: (toot) => !!(toot.account.isFollowed || toot.reblog?.account.isFollowed),
    [TypeFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.realToot.followedTags?.length,
    [TypeFilterName.IMAGES]:            (toot) => !!toot.realToot.imageAttachments?.length,
    [TypeFilterName.LINKS]:             (toot) => !!(toot.realToot.card || toot.realToot.trendingLinks?.length),
    [TypeFilterName.MENTIONS]:          (toot) => toot.containsUserMention(),
    [TypeFilterName.POLLS]:             (toot) => !!toot.realToot.poll,
    [TypeFilterName.PARTICIPATED_TAGS]: (toot) => !!toot.realToot.participatedTags?.length,
    [TypeFilterName.PRIVATE]:           (toot) => !!toot.realToot.isPrivate,
    [TypeFilterName.REPLIES]:           (toot) => !!toot.realToot.inReplyToId,
    [TypeFilterName.RETOOTS]:           (toot) => !!toot.reblog,
    [TypeFilterName.SENSITIVE]:         (toot) => !!toot.realToot.sensitive,
    [TypeFilterName.SPOILERED]:         (toot) => !!toot.realToot.spoilerText,
    [TypeFilterName.TRENDING_LINKS]:    (toot) => !!toot.realToot.trendingLinks?.length,
    [TypeFilterName.TRENDING_TAGS]:     (toot) => !!toot.realToot.trendingTags?.length,
    [TypeFilterName.TRENDING_TOOTS]:    (toot) => !!toot.realToot.trendingRank,
    [TypeFilterName.VIDEOS]:            (toot) => !!toot.realToot.videoAttachments?.length,
};

// Matchers for each BooleanFilterName.
const TOOT_MATCHERS: Record<BooleanFilterName, TootMatcher> = {
    [BooleanFilterName.APP]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.includes(toot.realToot.application?.name);
    },
    [BooleanFilterName.HASHTAG]: (toot: Toot, selectedOptions: string[]) => {
        return !!selectedOptions.find((v) => toot.realToot.containsString(v));
    },
    [BooleanFilterName.LANGUAGE]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.includes(toot.realToot.language || config.locale.defaultLanguage);
    },
    [BooleanFilterName.TYPE]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.some((v) => TYPE_FILTERS[v as TypeFilterName](toot));
    },
    [BooleanFilterName.USER]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.includes(toot.realToot.account.webfingerURI);
    },
};

/**
 * Arguments for BooleanFilter constructor.
 * @typedef {object} BooleanFilterArgs
 * @property {string[]} [selectedOptions] - The selected options.
 * @property {BooleanFilterName} title - The filter title.
 */
export interface BooleanFilterArgs extends FilterArgs {
    selectedOptions?: string[];
    title: BooleanFilterName;
};

/**
 * BooleanFilter for filtering toots by boolean criteria (e.g. language, hashtag, type).
 * @extends TootFilter
 */
export default class BooleanFilter extends TootFilter {
    /**
     * Which options are selected for use in the filter.
     * @type {string[]}
     */
    selectedOptions: string[];
    /**
     * The filter title/category.
     * @type {BooleanFilterName}
     */
    title: BooleanFilterName;

    /**
     * Get the current options list.
     * @returns {BooleanFilterOptionList}
     */
    get options() { return this._options };
    private _options: BooleanFilterOptionList;

    /**
     * Set the options list and remove invalid selected options.
     * @param {BooleanFilterOptionList} optionList
     */
    public set options(optionList: BooleanFilterOptionList) {
        this._options = optionList;
        this.selectedOptions = this.selectedOptions.filter((v) => !optionList.getObj(v));
    }

    constructor({ title, invertSelection, selectedOptions }: BooleanFilterArgs) {
        let optionInfo = new BooleanFilterOptionList([], title);
        let description: string;

        if (title == BooleanFilterName.TYPE) {
            description = SOURCE_FILTER_DESCRIPTION;
        } else {
            const descriptionWord = title == BooleanFilterName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${title}s`;
        }

        super({ description, invertSelection, title });
        this._options = optionInfo;
        this.title = title as BooleanFilterName;
        this.selectedOptions = selectedOptions ?? [];
    }

    /**
     * Return true if the toot matches the filter.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean}
     */
    isAllowed(toot: Toot): boolean {
        if (!this.selectedOptions.length) return true;  // If there's no selectedOptions allow everything
        const isMatched = TOOT_MATCHERS[this.title](toot, this.selectedOptions);
        return this.invertSelection ? !isMatched : isMatched;
    }

    /**
     * Return true if the option is in selectedOptions.
     * @param {string} optionName - The option name.
     * @returns {boolean}
     */
    isOptionEnabled(optionName: string): boolean {
        return this.selectedOptions.includes(optionName);
    }

    /**
     * Return only options that have at least minToots or are in selectedOptions.
     * @param {BooleanFilterOption[]} options - The options to filter.
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    optionListWithMinToots(options: BooleanFilterOption[], minToots: number = 0): BooleanFilterOptionList {
        options = options.filter(opt => (opt.numToots || 0) >= minToots || this.isOptionEnabled(opt.name));
        return new BooleanFilterOptionList(options, this.title);
    }

    /**
     * Return options sorted by name, filtered by minToots (selected options are always included).
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    optionsSortedByName(minToots: number = 0): BooleanFilterOptionList {
        let options = this.options.objs.toSorted((a, b) => compareStr(a.displayName || a.name, b.displayName || b.name));
        return this.optionListWithMinToots(options, minToots);
    }

    /**
     * Return options sorted by numToots, filtered by minToots.
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    optionsSortedByValue(minToots: number = 0): BooleanFilterOptionList {
        return this.optionListWithMinToots(this.options.topObjs(), minToots);
    }

    /**
     * Add or remove an option from the filter.
     * @param {string} optionName - The option name.
     * @param {boolean} isSelected - If true, add the option; if false, remove it.
     */
    updateOption(optionName: string, isSelected: boolean) {
        this.logger.debug(`Updating options for ${this.title} with ${optionName} and ${isSelected}`);

        if (isSelected && !this.isOptionEnabled(optionName)) {
            this.selectedOptions.push(optionName);
        } else {
            if (!this.isOptionEnabled(optionName)) {
                this.logger.warn(`Tried to remove ${optionName} from ${this.title} but it wasn't there`);
                return;
            }

            this.selectedOptions.splice(this.selectedOptions.indexOf(optionName), 1);
        }

        // Remove duplicates; build new Array object to trigger useMemo() in Demo App // TODO: not great
        this.selectedOptions = [...new Set(this.selectedOptions)];
    }

    /**
     * Required for serialization of settings to local storage.
     * @returns {BooleanFilterArgs}
     */
    toArgs(): BooleanFilterArgs {
        const filterArgs = super.toArgs() as BooleanFilterArgs;
        filterArgs.selectedOptions = this.selectedOptions;
        return filterArgs;
    }

    /**
     * Collate all the data sources that are used to populate properties of the same name for each BooleanFilterOption.
     * Note this won't be completely up to date but should be good enough for most purposes.
     * TODO: currently unused
     * @returns {Promise<FilterOptionDataSources>}
     */
    static async filterOptionDataSources(): Promise<FilterOptionDataSources> {
        const userData = await MastoApi.instance.getUserData();

        return {
            [BooleanFilterName.LANGUAGE]: userData.languagesPostedIn,
            [ScoreName.FAVOURITED_ACCOUNTS]: userData.favouriteAccounts,
            [TagTootsCacheKey.FAVOURITED_TAG_TOOTS]: userData.favouritedTags,
            [TagTootsCacheKey.PARTICIPATED_TAG_TOOTS]: userData.participatedTags,
            [TagTootsCacheKey.TRENDING_TAG_TOOTS]: await MastodonServer.fediverseTrendingTags(),
        };
    }

    /**
     * Checks if a given property name is a valid numeric filter name.
     * @param {string} name - The property name to check.
     * @returns {boolean} True if the name is a filterable numeric property.
     */
    static isValidTitle(name: string) {
        return isValueInStringEnum(BooleanFilterName)(name);
    }
};
