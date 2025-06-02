"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeObjWithTootCounts = exports.buildObjWithTootCount = void 0;
/*
 * A list of things with a name and a 'numToots' property that can be used
 * somewhat interchangeably as a dictionary or a sorted list.
 */
const user_data_1 = __importDefault(require("./user_data"));
const string_helpers_1 = require("../helpers/string_helpers");
const logger_1 = require("../helpers/logger");
const collection_helpers_1 = require("../helpers/collection_helpers");
const logger = new logger_1.Logger("TagList");
class ObjWithCountList {
    source;
    logger;
    length;
    nameDict = {}; // Dict of tag names to tags
    _objs;
    constructor(objs, label) {
        this._objs = objs.map(completeObjWithTootCounts);
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
        this.source = label;
        this.logger = label ? new logger_1.Logger(label, "TagList") : logger;
    }
    // Alternate constructor to create synthetic tags
    static buildFromDict(dict, label) {
        const objs = Object.entries(dict).map(([name, numToots]) => {
            const obj = { name, numToots, url: "blank" };
            return obj;
        });
        return new ObjWithCountList(objs, label);
    }
    get objs() {
        return this._objs;
    }
    // Has side effect of mutating the 'tagNames' dict property
    set objs(theTags) {
        this._objs = theTags;
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
    }
    // Remove elements that don't match the predicate(). Returns a new ObjWithCountList object
    filter(predicate) {
        return new ObjWithCountList(this.objs.filter(predicate), this.source);
    }
    // Return the tag if it exists in 'tags' array, otherwise undefined.
    getObj(name) {
        return this.nameDict[name.toLowerCase()];
    }
    map(callback) {
        return this.objs.map(callback);
    }
    // Find the maximum numAccounts property in objs
    maxNumAccounts() {
        const objsNumAccounts = this.objs.map(t => t.numAccounts).filter(n => !(0, string_helpers_1.isNull)(n) && !isNaN(n));
        return objsNumAccounts.length ? Math.max(...objsNumAccounts) : undefined;
    }
    // Find the maximum numToots property in objs
    maxNumToots() {
        const tagsNumToots = this.objs.map(t => t.numToots).filter(n => !(0, string_helpers_1.isNull)(n) && !isNaN(n));
        return tagsNumToots.length ? Math.max(...tagsNumToots) : undefined;
    }
    // Returns a dict of tag names to numToots, which is (for now) what is used by BooleanFilter
    nameToNumTootsDict() {
        return this.objs.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {});
    }
    // Remove tags that match any of the keywords
    removeKeywords(keywords) {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validObjs = this.objs.filter(tag => !keywords.includes(tag.name));
        this.logger.logArrayReduction(this.objs, validObjs, "tags", `matching keywords`); //  "${keywords}"`);
        this.objs = validObjs;
    }
    ;
    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags() {
        this.removeKeywords(await user_data_1.default.getMutedKeywords());
    }
    ;
    // Return numTags tags sorted by numAccounts if it exists, otherwise numToots, then by name
    // If 'numTags' is not set return all tags.
    topObjs(maxObjs) {
        const sortBy = (this.objs.every(t => t.numAccounts) ? "numAccounts" : "numToots");
        const sortByAndName = [sortBy, "name"];
        this.objs = (0, collection_helpers_1.sortObjsByProps)(Object.values(this.objs), sortByAndName, [false, true]);
        return maxObjs ? this.objs.slice(0, maxObjs) : this.objs;
    }
    // Return a dictionary of tag names to tags
    objNameDict() {
        return this.objs.reduce((objNames, obj) => {
            objNames[obj.name] = obj;
            return objNames;
        }, {});
    }
}
exports.default = ObjWithCountList;
;
function buildObjWithTootCount(name, numToots) {
    const obj = { name, numToots };
    return completeObjWithTootCounts(obj);
}
exports.buildObjWithTootCount = buildObjWithTootCount;
;
function completeObjWithTootCounts(obj) {
    obj.name = obj.name.toLowerCase();
    obj.regex ||= (0, string_helpers_1.wordRegex)(obj.name);
    return obj;
}
exports.completeObjWithTootCounts = completeObjWithTootCounts;
;
//# sourceMappingURL=obj_with_counts_list.js.map