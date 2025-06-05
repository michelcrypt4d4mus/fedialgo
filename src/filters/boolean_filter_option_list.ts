/*
 * Special case of ObjWithCountList for lists of boolean filter options.
 */
import Account from "../api/objects/account";
import ObjWithCountList from "../api/obj_with_counts_list";
import TagList from "../api/tag_list";
import UserData from "../api/user_data";
import { BooleanFilterName, ScoreName, TagTootsCacheKey } from "../enums";
import { languageName } from "../helpers/language_helper";
import {
    type BooleanFilterOption,
    type ObjListDataSource,
    type ObjWithTootCount,
    type StringNumberDict,
    type TagWithUsageCounts,
} from "../types";


export default class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {
    constructor(options: BooleanFilterOption[], source: BooleanFilterName) {
        super(options, source);
    }

    // Remove elements that don't match the predicate(). Returns a new TagList object
    filter(predicate: (option: BooleanFilterOption) => boolean): BooleanFilterOptionList {
        return new BooleanFilterOptionList(this.objs.filter(predicate), this.source as BooleanFilterName);
    }

    // Add one to the numToots property of the BooleanFilterOption for the given tag
    // and decorate with available information about the user's interactions with that tag
    incrementCount(name: string, displayName?: string, obj?: any): void {
        const option = this.nameDict[name] || this.createOption(name, displayName, obj);
        option.numToots = (option.numToots || 0) + 1;
    }

    // Overridden in subclasses for custom option creation/decoration
    createOption(name: string, _displayName?: string, _obj?: any): BooleanFilterOption {
        return this.createBasicOption(name);
    }

    // Create a basic BooleanFilterOption with the given name and add it to the list
    createBasicOption(name: string, displayName?: string): BooleanFilterOption {
        const option: BooleanFilterOption = { name, numToots: 0 };

        if (displayName) {
            option.displayName = displayName;
        }

        this.nameDict[name] = option;
        this.objs.push(option);
        return option;
    }
};


// BooleanFilterOptionList to create and decorate hashtag filter options.
export class HashtagFilterOptionList extends BooleanFilterOptionList {
    dataForTagPropLists!: Record<TagTootsCacheKey, TagList>;

    constructor(options: BooleanFilterOption[]) {
        super(options, BooleanFilterName.HASHTAG);
    }

    // Alternate constructor
    static async create(): Promise<HashtagFilterOptionList> {
        const optionList = new this([]);
        optionList.dataForTagPropLists = await TagList.allTagTootsLists();
        return optionList;
    }

    createOption(name: string): BooleanFilterOption {
        const option = this.createBasicOption(name);

        Object.entries(this.dataForTagPropLists).forEach(([key, tagList]) => {
            const propertyObj = tagList.getObj(option.name);

            if (propertyObj) {
                option[key as TagTootsCacheKey] = propertyObj.numToots || 0;
            }
        });

        return option;
    }
};


// BooleanFilterOptionList to create and decorate language filter options.
export class LanguageFilterOptionList extends BooleanFilterOptionList {
    userData!: UserData;

    constructor(options: BooleanFilterOption[]) {
        super(options, BooleanFilterName.LANGUAGE);
    }

    static async create(): Promise<LanguageFilterOptionList> {
        const optionList = new this([]);
        optionList.userData = await UserData.build();  // TODO: this only needs the languagePostedIn tag list, not the whole UserData
        return optionList;
    }

    createOption(languageCode: string): BooleanFilterOption {
        const option = this.createBasicOption(languageCode, languageName(languageCode));
        const languageUsage = this.userData.languagesPostedIn.getObj(languageCode);

        if (languageUsage) {
            option[BooleanFilterName.LANGUAGE] = languageUsage.numToots || 0;
        }

        return option;
    }
};


// BooleanFilterOptionList to create and decorate user filter options.
export class UserFilterOptionList extends BooleanFilterOptionList {
    userData!: UserData;

    constructor(options: BooleanFilterOption[]) {
        super(options, BooleanFilterName.USER);
    }

    static async create(): Promise<UserFilterOptionList> {
        const optionList = new this([]);
        optionList.userData = await UserData.build();
        return optionList;
    }

    createOption(_name: string, _displayName: string, account: Account): BooleanFilterOption {
        const option = this.createBasicOption(account.webfingerURI, account.displayName);
        const favouriteAccountProps = this.userData.favouriteAccounts.getObj(account.webfingerURI);

        if (favouriteAccountProps) {
            option.isFollowed = favouriteAccountProps.isFollowed;
            option[ScoreName.FAVOURITED_ACCOUNTS] = favouriteAccountProps.numToots || 0;
        }

        return option;
    }
};
