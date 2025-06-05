/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 */
import BooleanFilterOptionList from './boolean_filter_option_list';
import MastoApi from '../api/api';
import TagList from '../api/tag_list';
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { BooleanFilterName, ScoreName, TagTootsCacheKey, TypeFilterName } from '../enums';
import { compareStr } from '../helpers/string_helpers';
import { config } from '../config';
import { countValues, isValueInStringEnum } from "../helpers/collection_helpers";
import { languageName } from '../helpers/language_helper';
import { type BooleanFilterOption, type FilterArgs, type StringNumberDict } from "../types";

type TootMatcher = (toot: Toot, selectedOptions: string[]) => boolean;
type TypeFilter = (toot: Toot) => boolean;

const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";

export const isBooleanFilterName = (value: string) => isValueInStringEnum(BooleanFilterName)(value);
export const isTypeFilterName = (value: string) => isValueInStringEnum(TypeFilterName)(value);

// Defining a new filter just requires adding a new entry to TYPE_FILTERS
export const TYPE_FILTERS: Record<TypeFilterName, TypeFilter> = {
    [TypeFilterName.AUDIO]:             (toot) => !!toot.realToot().audioAttachments?.length,
    [TypeFilterName.BOT]:               (toot) => !!(toot.account.bot || toot.reblog?.account.bot),
    [TypeFilterName.DIRECT_MESSAGE]:    (toot) => toot.isDM(),
    [TypeFilterName.FOLLOWED_ACCOUNTS]: (toot) => !!(toot.account.isFollowed || toot.reblog?.account.isFollowed),
    [TypeFilterName.FOLLOWED_HASHTAGS]: (toot) => !!toot.realToot().followedTags?.length,
    [TypeFilterName.IMAGES]:            (toot) => !!toot.realToot().imageAttachments?.length,
    [TypeFilterName.LINKS]:             (toot) => !!(toot.realToot().card || toot.realToot().trendingLinks?.length),
    [TypeFilterName.MENTIONS]:          (toot) => toot.containsUserMention(),
    [TypeFilterName.POLLS]:             (toot) => !!toot.realToot().poll,
    [TypeFilterName.PARTICIPATED_TAGS]: (toot) => !!toot.realToot().participatedTags?.length,
    [TypeFilterName.PRIVATE]:           (toot) => !!toot.realToot().isPrivate(),
    [TypeFilterName.REPLIES]:           (toot) => !!toot.realToot().inReplyToId,
    [TypeFilterName.RETOOTS]:           (toot) => !!toot.reblog,
    [TypeFilterName.SENSITIVE]:         (toot) => !!toot.realToot().sensitive,
    [TypeFilterName.SPOILERED]:         (toot) => !!toot.realToot().spoilerText,
    [TypeFilterName.TRENDING_LINKS]:    (toot) => !!toot.realToot().trendingLinks?.length,
    [TypeFilterName.TRENDING_TAGS]:     (toot) => !!toot.realToot().trendingTags?.length,
    [TypeFilterName.TRENDING_TOOTS]:    (toot) => !!toot.realToot().trendingRank,
    [TypeFilterName.VIDEOS]:            (toot) => !!toot.realToot().videoAttachments?.length,
};

// Defining a new filter category just requires adding a new entry to TYPE_FILTERS
const TOOT_MATCHERS: Record<BooleanFilterName, TootMatcher> = {
    [BooleanFilterName.APP]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.includes(toot.realToot().application?.name);
    },
    [BooleanFilterName.HASHTAG]: (toot: Toot, selectedOptions: string[]) => {
        return !!selectedOptions.find((v) => toot.realToot().containsString(v));
    },
    [BooleanFilterName.LANGUAGE]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.includes(toot.realToot().language || config.locale.defaultLanguage);
    },
    [BooleanFilterName.TYPE]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.some((v) => TYPE_FILTERS[v as TypeFilterName](toot));
    },
    [BooleanFilterName.USER]: (toot: Toot, selectedOptions: string[]) => {
        return selectedOptions.includes(toot.realToot().account.webfingerURI);
    },
};

export interface BooleanFilterArgs extends FilterArgs {
    selectedOptions?: string[];
    title: BooleanFilterName;
};


export default class BooleanFilter extends TootFilter {
    selectedOptions: string[];         // Which options are selected for use in the filter
    title: BooleanFilterName
    private _options: BooleanFilterOptionList;  // e.g. counts of toots with this option

    constructor({ title, invertSelection, selectedOptions }: BooleanFilterArgs) {
        let optionInfo: BooleanFilterOptionList;
        let description: string;

        // Set up defaults for type filters so something always shows up in the options // TODO: is this necessary?
        if (title == BooleanFilterName.TYPE) {
            description = SOURCE_FILTER_DESCRIPTION;
            const optionCounts = countValues<TypeFilterName>(Object.values(TypeFilterName));
            optionInfo = BooleanFilterOptionList.buildFromDict(optionCounts, title);
        } else {
            const descriptionWord = title == BooleanFilterName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${title}s`;
            optionInfo = new BooleanFilterOptionList([], title);
        }

        super({ description, invertSelection, title });
        this._options = optionInfo;
        this.title = title as BooleanFilterName;
        this.selectedOptions = selectedOptions ?? [];
    }

    public get options(): BooleanFilterOptionList {
        return this._options;
    }

    // Has side effect of mutating the 'tagNames' dict property
    public set options(optionList: BooleanFilterOptionList) {
        this._options = optionList;
        this.selectedOptions = this.selectedOptions.filter((v) => !optionList.getObj(v));  // Remove options that are no longer valid
    }

    // Return true if the toot matches the filter
    isAllowed(toot: Toot): boolean {
        // If there's no selectedOptions allow everything
        if (!this.selectedOptions.length) return true;
        const isMatched = TOOT_MATCHERS[this.title](toot, this.selectedOptions);
        return this.invertSelection ? !isMatched : isMatched;
    }

    // If the option is in selectedOptions then it's enabled
    isOptionEnabled(optionName: string): boolean {
        return this.selectedOptions.includes(optionName);
    }

    // Return only options that have at least minToots or are in selectedOptions
    optionListWithMinToots(options: BooleanFilterOption[], minToots: number = 0): BooleanFilterOptionList {
        options = options.filter(opt => (opt.numToots || 0) >= minToots || this.isOptionEnabled(opt.name));
        return new BooleanFilterOptionList(options, this.title);
    }

    // If minToots is set then only return options with a value greater than or equal to minValue
    // along with any 'selectedOptions' entries that are below that threshold.
    optionsSortedByName(minToots: number = 0): BooleanFilterOptionList {
        let options = this.options.objs.toSorted((a, b) => compareStr(a.name, b.name));
        return this.optionListWithMinToots(options, minToots);
    }

    // Sort options by numToots, then by name
    optionsSortedByValue(minToots: number = 0): BooleanFilterOptionList {
        return this.optionListWithMinToots(this.options.topObjs(), minToots);
    }

    // Add the element to the filters array if it's not already there or remove it if it is
    // If isValidOption is false remove the element from the filter instead of adding it
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

    // Required for serialization of settings to local storage
    toArgs(): BooleanFilterArgs {
        const filterArgs = super.toArgs() as BooleanFilterArgs;
        filterArgs.selectedOptions = this.selectedOptions;
        return filterArgs;
    }

    // Build an empty of dict of dicts with an entry for each BooleanFilterName
    static buildBooleanFilterDict<T extends Record<string, number | BooleanFilterOption>>(): Record<BooleanFilterName, T> {
        return Object.values(BooleanFilterName).reduce(
            (dict, filterName) => {
                dict[filterName] = {} as T;
                return dict;
            },
            {} as Record<BooleanFilterName, T>
        );
    }
};
