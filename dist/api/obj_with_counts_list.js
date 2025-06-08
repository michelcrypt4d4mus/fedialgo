"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * A list of things with a name and a 'numToots' property that can be used
 * somewhat interchangeably as a dictionary or a sorted list.
 */
const user_data_1 = __importDefault(require("./user_data"));
const math_helper_1 = require("../helpers/math_helper");
const logger_1 = require("../helpers/logger");
const collection_helpers_1 = require("../helpers/collection_helpers");
const string_helpers_1 = require("../helpers/string_helpers");
class ObjWithCountList {
    logger;
    length;
    nameDict = {}; // Dict of obj.names to objs
    source;
    get maxNumToots() { return this._maxNumToots; }
    ;
    get objs() { return this._objs; }
    ;
    _maxNumToots; // Cached max numToots value, if it exists
    _objs;
    // Has side effect of mutating the 'tagNames' dict property
    set objs(objs) {
        this._objs = objs;
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
        this._maxNumToots = this.maxValue("numToots");
    }
    constructor(objs, source) {
        this._objs = objs.map(completeObjWithTootCounts);
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
        this.source = source;
        this.logger = new logger_1.Logger("ObjWithCountList", source);
    }
    // Add objects we don't already have. This does NOT set the numToots property on incoming objs!
    addObjs(objs) {
        this.objs = [...this.objs, ...objs.filter(obj => !this.nameDict[obj.name])];
    }
    // Remove elements that don't match the predicate(). Returns a new ObjWithCountList object
    filter(predicate) {
        return new ObjWithCountList(this.objs.filter(predicate), this.source);
    }
    // Return the tag if it exists in 'tags' array, otherwise undefined.
    getObj(name) {
        return this.nameDict[name.toLowerCase()];
    }
    // Increment numToots for the given name. If no obj with 'name' exists create a new one
    // and call the decorator function on the new function if provided.
    incrementCount(name, newObjDecorator) {
        let option = this.nameDict[name];
        if (!option) {
            option = { name, numToots: 0 };
            this.nameDict[name] = option;
            this.objs.push(option);
            newObjDecorator?.(option);
        }
        option.numToots = (option.numToots || 0) + 1;
        return option;
    }
    // Standard map function that applies a callback to each object in the objs array
    map(callback) {
        return this.objs.map((obj, i) => callback(obj, i));
    }
    // Get the maximum value for a given key across the objs array
    maxValue(propertyName) {
        const values = this.objs.map(obj => obj[propertyName]).filter(n => (0, math_helper_1.isNumber)(n));
        return values.length ? Math.max(...values) : undefined;
    }
    // Returns a dict of tag names to numToots, which is (for now) what is used by BooleanFilter
    nameToNumTootsDict() {
        return this.objs.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {});
    }
    // Populate the objs array by counting the number of times each 'name' (given by propExtractor) appears
    // Resulting BooleanFilterOptions will be decorated with properties returned by propExtractor().
    populateByCountingProps(objs, propExtractor) {
        this.logger.deep(`populateByCountingProps() - Counting properties in ${objs.length} objects...`);
        const options = objs.reduce((optionDict, obj) => {
            const extractedProps = propExtractor(obj);
            optionDict[extractedProps.name] ??= extractedProps;
            optionDict[extractedProps.name].numToots = (optionDict[extractedProps.name].numToots || 0) + 1;
            return optionDict;
        }, {});
        this.objs = Object.values(options);
    }
    // Remove tags that match any of the keywords
    removeKeywords(keywords) {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validObjs = this.objs.filter(tag => !keywords.includes(tag.name));
        this.logger.logArrayReduction(this.objs, validObjs, "Tag", `matching keywords`); //  "${keywords}"`);
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
function completeObjWithTootCounts(obj) {
    obj.name = obj.name.toLowerCase();
    obj.regex ||= (0, string_helpers_1.wordRegex)(obj.name);
    return obj;
}
;
//# sourceMappingURL=obj_with_counts_list.js.map