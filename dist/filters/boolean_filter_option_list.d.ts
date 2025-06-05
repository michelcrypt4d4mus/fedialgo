import Account from "../api/objects/account";
import ObjWithCountList from "../api/obj_with_counts_list";
import TagList from "../api/tag_list";
import UserData from "../api/user_data";
import { BooleanFilterName, TagTootsCacheKey } from "../enums";
import { type BooleanFilterOption } from "../types";
export default class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {
    constructor(options: BooleanFilterOption[], source: BooleanFilterName);
    filter(predicate: (option: BooleanFilterOption) => boolean): BooleanFilterOptionList;
    incrementCount(name: string, displayName?: string, obj?: any): void;
    createOption(name: string, _displayName?: string, _obj?: any): BooleanFilterOption;
    createBasicOption(name: string, displayName?: string): BooleanFilterOption;
    getOrCreateOption(name: string, displayName?: string, obj?: any): BooleanFilterOption;
}
export declare class HashtagFilterOptionList extends BooleanFilterOptionList {
    dataForTagPropLists: Record<TagTootsCacheKey, TagList>;
    constructor(options: BooleanFilterOption[]);
    static create(): Promise<HashtagFilterOptionList>;
    createOption(name: string): BooleanFilterOption;
}
export declare class LanguageFilterOptionList extends BooleanFilterOptionList {
    userData: UserData;
    constructor(options: BooleanFilterOption[]);
    static create(): Promise<LanguageFilterOptionList>;
    createOption(languageCode: string): BooleanFilterOption;
}
export declare class UserFilterOptionList extends BooleanFilterOptionList {
    userData: UserData;
    constructor(options: BooleanFilterOption[]);
    static create(): Promise<UserFilterOptionList>;
    createOption(_name: string, _displayName: string, account: Account): BooleanFilterOption;
}
