"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFilterOptionList = exports.LanguageFilterOptionList = exports.HashtagFilterOptionList = void 0;
const obj_with_counts_list_1 = __importDefault(require("../api/obj_with_counts_list"));
const tag_list_1 = __importDefault(require("../api/tag_list"));
const user_data_1 = __importDefault(require("../api/user_data"));
const enums_1 = require("../enums");
const language_helper_1 = require("../helpers/language_helper");
class BooleanFilterOptionList extends obj_with_counts_list_1.default {
    constructor(options, source) {
        super(options, source);
    }
    // Remove elements that don't match the predicate(). Returns a new TagList object
    // Have to overload this because of typescript's broken alternate constructor handling
    filter(predicate) {
        return new BooleanFilterOptionList(this.objs.filter(predicate), this.source);
    }
    // Add one to the numToots property of the BooleanFilterOption for the given tag
    // and decorate with available information about the user's interactions with that tag
    incrementCount(name, displayName, obj) {
        const option = this.getOrCreateOption(name, displayName, obj);
        option.numToots = (option.numToots || 0) + 1;
    }
    // Overridden in subclasses for custom option creation/decoration
    createOption(name, _displayName, _obj) {
        return this.createBasicOption(name);
    }
    // Create a basic BooleanFilterOption with the given name and add it to the list
    createBasicOption(name, displayName) {
        const option = { name };
        if (displayName) {
            option.displayName = displayName;
        }
        this.nameDict[name] = option;
        this.objs.push(option);
        return option;
    }
    getOrCreateOption(name, displayName, obj) {
        return this.nameDict[name] || this.createOption(name, displayName, obj);
    }
}
exports.default = BooleanFilterOptionList;
;
// BooleanFilterOptionList to create and decorate hashtag filter options.
class HashtagFilterOptionList extends BooleanFilterOptionList {
    dataForTagPropLists;
    userData;
    constructor(options) {
        super(options, enums_1.BooleanFilterName.HASHTAG);
    }
    // Alternate constructor
    static async create() {
        const optionList = new this([]);
        optionList.dataForTagPropLists = await tag_list_1.default.allTagTootsLists();
        optionList.userData = await user_data_1.default.build(); // TODO: we only need the followedTags list, not the whole UserData
        return optionList;
    }
    createOption(name) {
        const option = this.createBasicOption(name);
        Object.entries(this.dataForTagPropLists).forEach(([key, tagList]) => {
            const propertyObj = tagList.getObj(option.name);
            if (propertyObj) {
                option[key] = propertyObj.numToots || 0;
            }
        });
        if (this.userData.followedTags.getObj(option.name)) {
            option.isFollowed = true;
        }
        return option;
    }
}
exports.HashtagFilterOptionList = HashtagFilterOptionList;
;
// BooleanFilterOptionList to create and decorate language filter options.
class LanguageFilterOptionList extends BooleanFilterOptionList {
    userData;
    constructor(options) {
        super(options, enums_1.BooleanFilterName.LANGUAGE);
    }
    static async create() {
        const optionList = new this([]);
        optionList.userData = await user_data_1.default.build(); // TODO: this only needs the languagePostedIn tag list, not the whole UserData
        return optionList;
    }
    createOption(languageCode) {
        const option = this.createBasicOption(languageCode, (0, language_helper_1.languageName)(languageCode));
        const languageUsage = this.userData.languagesPostedIn.getObj(languageCode);
        if (languageUsage) {
            option[enums_1.BooleanFilterName.LANGUAGE] = languageUsage.numToots || 0;
        }
        return option;
    }
}
exports.LanguageFilterOptionList = LanguageFilterOptionList;
;
// BooleanFilterOptionList to create and decorate user filter options.
class UserFilterOptionList extends BooleanFilterOptionList {
    userData;
    constructor(options) {
        super(options, enums_1.BooleanFilterName.USER);
    }
    static async create() {
        const optionList = new this([]);
        optionList.userData = await user_data_1.default.build();
        return optionList;
    }
    createOption(_name, _displayName, account) {
        const option = this.createBasicOption(account.webfingerURI, account.displayName);
        const favouriteAccountProps = this.userData.favouriteAccounts.getObj(account.webfingerURI);
        if (favouriteAccountProps) {
            option.isFollowed = favouriteAccountProps.isFollowed;
            option[enums_1.ScoreName.FAVOURITED_ACCOUNTS] = favouriteAccountProps.numToots || 0;
        }
        return option;
    }
}
exports.UserFilterOptionList = UserFilterOptionList;
;
//# sourceMappingURL=boolean_filter_option_list.js.map