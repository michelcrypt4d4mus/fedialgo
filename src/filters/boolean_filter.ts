/*
 * Feed filtering information related to a single criterion on which toots
 * can be filtered inclusively or exclusively based on an array of strings
 * (e.g. language, hashtag, type of toot).
 */
import MastoApi from '../api/api';
import BooleanFilterOptionList from './boolean_filter_option_list';
import ObjWithCountList, { ObjList } from '../api/obj_with_counts_list';
import Toot from '../api/objects/toot';
import TootFilter from "./toot_filter";
import { alphabetize, compareStr, wordRegex } from '../helpers/string_helpers';
import { config } from '../config';
import { countValues, isValueInStringEnum } from "../helpers/collection_helpers";
import { type BooleanFilterOption, type FilterArgs, type StringNumberDict } from "../types";
import TagList from '../api/tag_list';
import { ScoreName, TagTootsCacheKey } from '../enums';
import UserData from '../api/user_data';

type TypeFilter = (toot: Toot) => boolean;
type TootMatcher = (toot: Toot, validValues: string[]) => boolean;

const SOURCE_FILTER_DESCRIPTION = "Choose what kind of toots are in your feed";

// This is the order the filters will appear in the UI in the demo app
export enum BooleanFilterName {
    HASHTAG = 'hashtag',
    LANGUAGE = 'language',
    TYPE = 'type',
    USER = 'user',
    APP = 'app',  // App filter visibility is controlled by Config.isAppFilterVisible
};

export enum TypeFilterName {
    AUDIO = 'audio',
    BOT = 'bot',
    DIRECT_MESSAGE = 'directMessages',
    FOLLOWED_ACCOUNTS = 'followedAccounts',
    FOLLOWED_HASHTAGS = 'followedHashtags',
    IMAGES = 'images',
    LINKS = 'links',
    MENTIONS = 'mentions',
    PARTICIPATED_TAGS = 'participatedHashtags',
    POLLS = 'polls',
    PRIVATE = 'private',
    REPLIES = 'replies',
    RETOOTS = 'retoots',
    SENSITIVE = 'sensitive',
    SPOILERED = 'spoilered',
    TRENDING_LINKS = 'trendingLinks',
    TRENDING_TAGS = 'trendingHashtags',
    TRENDING_TOOTS = 'trendingToots',
    VIDEOS = 'videos',
};

export const isBooleanFilterName = (value: string) => isValueInStringEnum(BooleanFilterName)(value);
export const isTypeFilterName = (value: string) => isValueInStringEnum(TypeFilterName)(value);

// Defining a new filter just requires adding a new entry to TYPE_FILTERS
export const TYPE_FILTERS: Record<TypeFilterName, TypeFilter> = {
    [TypeFilterName.AUDIO]:                 (toot) => !!toot.realToot().audioAttachments.length,
    [TypeFilterName.BOT]:                   (toot) => !!(toot.account.bot || toot.reblog?.account.bot),
    [TypeFilterName.DIRECT_MESSAGE]:        (toot) => toot.isDM(),
    [TypeFilterName.FOLLOWED_ACCOUNTS]:     (toot) => !!(toot.account.isFollowed || toot.reblog?.account.isFollowed),
    [TypeFilterName.FOLLOWED_HASHTAGS]:     (toot) => !!toot.realToot().followedTags?.length,
    [TypeFilterName.IMAGES]:                (toot) => !!toot.realToot().imageAttachments.length,
    [TypeFilterName.LINKS]:                 (toot) => !!(toot.realToot().card || toot.realToot().trendingLinks?.length),
    [TypeFilterName.MENTIONS]:              (toot) => toot.containsUserMention(),
    [TypeFilterName.POLLS]:                 (toot) => !!toot.realToot().poll,
    [TypeFilterName.PARTICIPATED_TAGS]: (toot) => !!toot.realToot().participatedTags?.length,
    [TypeFilterName.PRIVATE]:               (toot) => !!toot.realToot().isPrivate(),
    [TypeFilterName.REPLIES]:               (toot) => !!toot.realToot().inReplyToId,
    [TypeFilterName.RETOOTS]:               (toot) => !!toot.reblog,
    [TypeFilterName.SENSITIVE]:             (toot) => !!toot.realToot().sensitive,
    [TypeFilterName.SPOILERED]:             (toot) => !!toot.realToot().spoilerText,
    [TypeFilterName.TRENDING_LINKS]:        (toot) => !!toot.realToot().trendingLinks?.length,
    [TypeFilterName.TRENDING_TAGS]:         (toot) => !!toot.realToot().trendingTags?.length,
    [TypeFilterName.TRENDING_TOOTS]:        (toot) => !!toot.realToot().trendingRank,
    [TypeFilterName.VIDEOS]:                (toot) => !!toot.realToot().videoAttachments.length,
};

// Defining a new filter category just requires adding a new entry to TYPE_FILTERS
const TOOT_MATCHERS: Record<BooleanFilterName, TootMatcher> = {
    [BooleanFilterName.APP]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.realToot().application?.name);
    },
    [BooleanFilterName.HASHTAG]: (toot: Toot, validValues: string[]) => {
        return !!validValues.find((v) => toot.realToot().containsString(v));
    },
    [BooleanFilterName.LANGUAGE]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.realToot().language || config.locale.defaultLanguage);
    },
    [BooleanFilterName.TYPE]: (toot: Toot, validValues: string[]) => {
        return validValues.some((v) => TYPE_FILTERS[v as TypeFilterName](toot));
    },
    [BooleanFilterName.USER]: (toot: Toot, validValues: string[]) => {
        return validValues.includes(toot.realToot().account.webfingerURI);
    },
};

export interface BooleanFilterArgs extends FilterArgs {
    optionInfo?: BooleanFilterOption[];  // e.g. counts of toots with this option
    validValues?: string[];
};


export default class BooleanFilter extends TootFilter {
    optionInfo: BooleanFilterOptionList;  // e.g. counts of toots with this option
    title: BooleanFilterName
    validValues: string[];
    visible: boolean = true;  // true if the filter should be returned via TheAlgorithm.getFilters()
    // TODO: effectiveOptionInfo: StringNumberDict = {};  // optionInfo with the counts of toots that match the filter

    constructor({ title, invertSelection, optionInfo, validValues }: BooleanFilterArgs) {
        optionInfo ??= [];
        let description: string;

        if (title == BooleanFilterName.TYPE) {
            // Set up the default for type filters so something always shows up in the options
            const optionCounts = countValues<TypeFilterName>(Object.values(TypeFilterName));
            optionInfo = BooleanFilterOptionList.buildFromDict(optionCounts, title).objs;
            description = SOURCE_FILTER_DESCRIPTION;
        } else {
            const descriptionWord = title == BooleanFilterName.HASHTAG ? "including" : "from";
            description = `Show only toots ${descriptionWord} these ${title}s`;
        }

        super({ description, invertSelection, title });
        this.title = title as BooleanFilterName
        this.optionInfo = new BooleanFilterOptionList(optionInfo ?? [], title);
        this.validValues = validValues ?? [];

        // The app filter is kind of useless so we mark it as invisible via config option
        if (this.title == BooleanFilterName.APP) {
            this.visible = config.gui.isAppFilterVisible;
        }
    }

    // Return the available options sorted by value from highest to lowest
    // If minValue is set then only return options with a value greater than or equal to minValue
    // along with any 'validValues' entries that are below that threshold.
    // optionsSortedByValue(minValue?: number): BooleanFilterOptionList[] {
    optionsSortedByValue(minValue?: number): BooleanFilterOptionList {
        let options = this.optionInfo.topObjs();

        if (minValue) {
            options = options.filter(o => (o.numToots || 0) >= minValue || this.isThisSelectionEnabled(o.name));
        }

        return new BooleanFilterOptionList(options, this.title);
    }

    optionsSortedByName(minValue?: number): BooleanFilterOptionList {
        let options = this.optionInfo.objs.toSorted((a, b) => compareStr(a.name, b.name));

        if (minValue) {
            options = options.filter(o => (o.numToots || 0) >= minValue || this.isThisSelectionEnabled(o.name));
        }

        return new BooleanFilterOptionList(options, this.title);
    }

    // Return true if the toot matches the filter
    isAllowed(toot: Toot): boolean {
        // If there's no validValues allow everything
        if (this.validValues.length === 0) return true;
        const isMatched = TOOT_MATCHERS[this.title](toot, this.validValues);
        return this.invertSelection ? !isMatched : isMatched;
    }

    // If the option is in validValues then it's enabled
    isThisSelectionEnabled(optionName: string): boolean {
        return this.validValues.includes(optionName);
    }

    // Return the available options sorted by value from highest to lowest
    // If minValue is set then only return options with a value greater than or equal to minValue
    // along with any 'validValues' entries that are below that threshold.
    // optionsSortedByValue(minValue?: number): BooleanFilterOptionList[] {
    //     let options = this.entriesSortedByValue();

    //     if (minValue) {
    //         options = options.filter(([k, v]) => v >= minValue || this.isThisSelectionEnabled(k));
    //     }

    //     return options.map(([k, _v]) => k);
    // }

    // Update the filter with the possible options that can be selected for validValues
    // TODO: convert to setter
    async setOptions(optionInfo: StringNumberDict) {
        this.validValues = this.validValues.filter((v) => v in optionInfo);  // Remove options that are no longer valid
        this.optionInfo = BooleanFilterOptionList.buildFromDict(optionInfo, this.title);

        // Add additional information about the option - participation counts, favourited counts, etc.
        if (this.title == BooleanFilterName.HASHTAG) {
            const favouritedTags = (await TagList.fromFavourites()).nameToNumTootsDict();
            const participatedTags = (await TagList.fromParticipated()).nameToNumTootsDict();
            const trendingTags = (await TagList.fromTrending()).nameToNumTootsDict();

            this.optionInfo.objs.forEach((option) => {
                if (favouritedTags[option.name]) option[TagTootsCacheKey.FAVOURITED_TAG_TOOTS] = favouritedTags[option.name] || 0;
                if (participatedTags[option.name]) option[TagTootsCacheKey.PARTICIPATED_TAG_TOOTS] = participatedTags[option.name] || 0;
                if (trendingTags[option.name]) option[TagTootsCacheKey.TRENDING_TAG_TOOTS] = trendingTags[option.name] || 0;
            });

            const optionsToLog = this.optionInfo.filter(option => (
                ((option[TagTootsCacheKey.FAVOURITED_TAG_TOOTS] || 0) +
                (option[TagTootsCacheKey.PARTICIPATED_TAG_TOOTS] || 0) +
                (option[TagTootsCacheKey.TRENDING_TAG_TOOTS] || 0)) > 0
            ));

            this.logger.trace(`setOptions() built new options:`, optionsToLog.topObjs(100));
        } else if (this.title == BooleanFilterName.USER) {
            const favouritedAccounts = (await MastoApi.instance.getUserData()).favouriteAccounts;

            this.optionInfo.objs.forEach((option) => {
                if (favouritedAccounts.getObj(option.name)) {
                    option[ScoreName.FAVOURITED_ACCOUNTS] = favouritedAccounts.getObj(option.name)?.numToots || 0;
                }
            })

            const optionsToLog = this.optionInfo.filter(option => !!option[ScoreName.FAVOURITED_ACCOUNTS]);
            this.logger.trace(`setOptions() built new options:`, optionsToLog.topObjs(100));
        }
    }

    // Add the element to the filters array if it's not already there or remove it if it is
    // If isValidOption is false remove the element from the filter instead of adding it
    updateValidOptions(element: string, isValidOption: boolean) {
        this.logger.debug(`Updating options for ${this.title} with ${element} and ${isValidOption}`);

        if (isValidOption && !this.isThisSelectionEnabled(element)) {
            this.validValues.push(element);
        } else {
            if (!this.isThisSelectionEnabled(element)) {
                this.logger.warn(`Tried to remove ${element} from ${this.title} but it wasn't there`);
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
