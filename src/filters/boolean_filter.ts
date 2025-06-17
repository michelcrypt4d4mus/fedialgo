/**
 * @fileoverview Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 */
import { isNil } from 'lodash';

import Toot from '../api/objects/toot';
import TootFilter, { type FilterArgs } from "./toot_filter";
import { BooleanFilterName, TypeFilterName, isValueInStringEnum } from '../enums';
import { BooleanFilterOptionList } from '../api/counted_list';
import { compareStr } from '../helpers/string_helpers';
import { config } from '../config';
import { type BooleanFilterOption } from "../types";

type TootMatcher = (toot: Toot, selectedOptions: string[]) => boolean;
type TypeFilter = (toot: Toot) => boolean;

const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";

// Type-based filters for toots. Defining a new filter just requires adding a new TypeFilterName
// and a function that matches the toot.
export const TYPE_FILTERS: Record<TypeFilterName, TypeFilter> = {
    [TypeFilterName.AUDIO]:             (toot) => !!toot.realToot.audioAttachments?.length,
    [TypeFilterName.BOT]:               (toot) => toot.accounts.some(account => account.bot),
    [TypeFilterName.DIRECT_MESSAGE]:    (toot) => toot.isDM,
    [TypeFilterName.FOLLOWED_ACCOUNTS]: (toot) => toot.accounts.some(account => account.isFollowed),
    [TypeFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.realToot.followedTags?.length,
    [TypeFilterName.IMAGES]:            (toot) => !!toot.realToot.imageAttachments?.length,
    [TypeFilterName.LINKS]:             (toot) => !!(toot.realToot.card || toot.realToot.trendingLinks?.length),
    [TypeFilterName.MENTIONS]:          (toot) => toot.containsUserMention(),
    [TypeFilterName.POLLS]:             (toot) => !!toot.realToot.poll,
    [TypeFilterName.PARTICIPATED_TAGS]: (toot) => !!toot.realToot.participatedTags?.length,
    [TypeFilterName.PRIVATE]:           (toot) => toot.realToot.isPrivate,
    [TypeFilterName.REPLIES]:           (toot) => !!toot.realToot.inReplyToId,
    [TypeFilterName.RETOOTS]:           (toot) => !!toot.reblog,
    [TypeFilterName.SENSITIVE]:         (toot) => toot.realToot.sensitive,
    [TypeFilterName.SPOILERED]:         (toot) => !!toot.realToot.spoilerText,
    [TypeFilterName.TRENDING_LINKS]:    (toot) => !!toot.realToot.trendingLinks?.length,
    [TypeFilterName.TRENDING_TAGS]:     (toot) => !!toot.realToot.trendingTags?.length,
    [TypeFilterName.TRENDING_TOOTS]:    (toot) => !!toot.realToot.trendingRank,
    [TypeFilterName.VIDEOS]:            (toot) => !!toot.realToot.videoAttachments?.length,
} as const;

// Matchers for each BooleanFilterName.
const TOOT_MATCHERS: Record<BooleanFilterName, TootMatcher> = {
    [BooleanFilterName.APP]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.includes(toot.realToot.application?.name);
    },
    [BooleanFilterName.SERVER]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.includes(toot.homeserver);
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
} as const;

export interface BooleanFilterArgs extends Omit<FilterArgs, "description"> {
    selectedOptions?: string[];
    propertyName: BooleanFilterName;
};


/**
 * BooleanFilter for filtering toots by boolean criteria (e.g. language, hashtag, type).
 * @augments TootFilter
 * @property {string} [description] - Optional description of the filter for display or documentation purposes.
 * @property {boolean} [invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
 * @property {BooleanFilterOptionList} options - The BooleanFilterOptions available for this filter.
 * @property {BooleanFilterName} propretyName - The BooleanFilterOptions available for this filter.
 * @property {string[]} selectedOptions - The names of the options selected for use in filtering.
 */
export default class BooleanFilter extends TootFilter {
    selectedOptions: string[];
    propertyName: BooleanFilterName;

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

    /**
     * @param {BooleanFilterArgs} params - The filter arguments.
     * @param {boolean} [params.invertSelection] - If true, the filter logic is inverted (e.g., exclude instead of include).
     * @param {string[]} [params.selectedOptions] - The selected options.
     * @param {BooleanFilterName} params.propertyName - The property the filter is working with (hashtags/toot type/etc).
     */
    constructor(params: BooleanFilterArgs) {
        const { invertSelection, propertyName, selectedOptions } = params;
        const optionInfo = new BooleanFilterOptionList([], propertyName);
        let description: string;

        if (propertyName == BooleanFilterName.TYPE) {
            description = SOURCE_FILTER_DESCRIPTION;
        } else {
            const descriptionWord = propertyName == BooleanFilterName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${propertyName}s`;
        }

        super({ description, invertSelection, propertyName });
        this._options = optionInfo;
        this.propertyName = propertyName;
        this.selectedOptions = selectedOptions ?? [];
    }

    /**
     * Return true if the toot matches the filter.
     * @param {Toot} toot - The toot to check.
     * @returns {boolean}
     */
    isAllowed(toot: Toot): boolean {
        if (!this.selectedOptions.length) return true;  // If there's no selectedOptions allow everything
        const isMatched = TOOT_MATCHERS[this.propertyName](toot, this.selectedOptions);
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
     * Return options with numToots >= minToots sorted by name (selected options are always included).
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    optionsSortedByName(minToots: number = 0): BooleanFilterOptionList {
        const options = this.options.objs.toSorted(
            (a, b) => compareStr(a.displayName || a.name, b.displayName || b.name)
        );

        return this.optionListWithMinToots(options, minToots);
    }

    /**
     * Return options with numToots >= minToots sorted by numToots (selected options are always included).
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
    updateOption(optionName: string, isSelected: boolean): void {
        this.logger.debug(`Updating options for ${this.propertyName} with ${optionName} and ${isSelected}`);

        if (isSelected && !this.isOptionEnabled(optionName)) {
            this.selectedOptions.push(optionName);
        } else {
            if (!this.isOptionEnabled(optionName)) {
                this.logger.warn(`Tried to remove ${optionName} from ${this.propertyName} but it wasn't there`);
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
     * Return only options that have at least minToots or are in selectedOptions.
     * @private
     * @param {BooleanFilterOption[]} options - The options to filter.
     * @param {number} [minToots=0] - Minimum number of toots.
     * @returns {BooleanFilterOptionList}
     */
    private optionListWithMinToots(options: BooleanFilterOption[], minToots: number = 0): BooleanFilterOptionList {
        options = options.filter(opt => (opt.numToots || 0) >= minToots || this.isOptionEnabled(opt.name));
        return new BooleanFilterOptionList(options, this.propertyName);
    }

    /**
     * Checks if a given property name is a valid numeric filter name.
     * @param {string} name - The property name to check.
     * @returns {boolean} True if the name is a filterable numeric property.
     */
    static isValidFilterProperty(name: string): boolean {
        return !isNil(name) && isValueInStringEnum(BooleanFilterName)(name);
    }
};
