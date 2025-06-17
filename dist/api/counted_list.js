"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanFilterOptionList = void 0;
/*
 * Base class for lists of things with a name and a 'numToots' property that can be used
 * somewhat interchangeably as a dictionary or a sorted list.
 */
const lodash_1 = require("lodash");
const user_data_1 = __importDefault(require("./user_data"));
const logger_1 = require("../helpers/logger");
const collection_helpers_1 = require("../helpers/collection_helpers");
const string_helpers_1 = require("../helpers/string_helpers");
/**
 * Generic list-ish class for NamedTootCount objects with 'name' and 'numToots' properties.
 * Supports both dictionary and sorted list operations, and provides utility methods
 * for filtering, mapping, counting, and muting/removing items by keywords or server-side filters.
 * @template T extends NamedTootCount
 * @property {number} length - The number of objects in the list.*
 * @property {Logger} logger - Logger instance for this list.
 * @property {Record<string, T>} nameDict - Dictionary mapping object names to objects.
 * @property {ListSource} source - The source of the list (for logging/context).
 * @property {number | undefined} maxNumToots - The maximum numToots value in the list.
 * @property {T[]} objs - The array of objects in the list.
 */
class CountedList {
    length = 0;
    logger;
    nameDict = {}; // Dict of obj.names to objs
    source;
    get maxNumToots() { return this._maxNumToots; }
    ;
    _maxNumToots; // Cached max numToots value, if it exists
    get objs() { return this._objs; }
    ;
    _objs = [];
    // Has side effect of mutating the 'tagNames' dict property
    set objs(objs) {
        this._objs = objs.map(this.completeObjProperties);
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
        this._maxNumToots = this.maxValue("numToots");
    }
    constructor(objs, source) {
        this.objs = objs;
        this.source = source;
        this.logger = new logger_1.Logger("ObjWithCountList", source);
    }
    // Add objects we don't already have. This does NOT set the numToots property on incoming objs!
    addObjs(objs) {
        this.objs = [...this.objs, ...objs.filter(obj => !this.nameDict[obj.name])];
    }
    /**
     * Like the standard Array.filter().
     * @param {function} predicate - Function to test each object in the list.
     * @returns {CountedList<T>} A new CountedList containing only the objects that match the predicate.
     */
    filter(predicate) {
        return new CountedList(this.objs.filter(predicate), this.source);
    }
    /**
     * Returns the object in the list with the given name, or undefined if not found.
     * Name matching is case-insensitive.
     * @param {string} name - The name of the object to retrieve.
     * @returns {T | undefined} The object with the specified name, or undefined if not found.
     */
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
    /**
     * Get the maximum value for a given key across the objs array
     * @returns {number | undefined} The maximum value for the specified property, or undefined if none exist.
     */
    maxValue(propertyName) {
        const values = this.objs.map(obj => obj[propertyName]).filter(n => (0, lodash_1.isFinite)(n));
        return values.length ? Math.max(...values) : undefined;
    }
    /**
     * Returns a dict of 'obj.name' to 'obj.numToots'.
     * @returns {StringNumberDict} Dictionary mapping object names to their numToots counts.
     */
    nameToNumTootsDict() {
        return this.objs.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {});
    }
    /**
     * Populate the objs array by counting the number of times each 'name' (given by propExtractor) appears
     * Resulting BooleanFilterOptions will be decorated with properties returned by propExtractor().
     * @template U - Type of the objects in the input array.*
     * @param {U[]} objs - Array of objects to count properties from.
     * @param {(obj: U) => T} propExtractor - Function to extract the properties to count from each object.
     * @returns {void}
     */
    populateByCountingProps(objs, propExtractor) {
        this.logger.deep(`populateByCountingProps() - Counting properties in ${objs.length} objects...`);
        const options = objs.reduce((objsWithCounts, obj) => {
            const extractedProps = propExtractor(obj);
            objsWithCounts[extractedProps.name] ??= extractedProps;
            objsWithCounts[extractedProps.name].numToots = (objsWithCounts[extractedProps.name].numToots || 0) + 1;
            return objsWithCounts;
        }, {});
        this.objs = Object.values(options);
    }
    /**
     * Remove any obj whose 'name' is watches any of 'keywords'.
     * @returns {Promise<void>}
     */
    removeKeywords(keywords) {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validObjs = this.objs.filter(tag => !keywords.includes(tag.name));
        this.logger.logArrayReduction(this.objs, validObjs, "Tag", `matching keywords`); //  "${keywords}"`);
        this.objs = validObjs;
    }
    ;
    /**
     * Remove any obj whose 'name' is muted by the user's server side filters.
     * TODO: use UserData's cached muted keywords regex?
     * @returns {Promise<void>}
     */
    async removeMutedTags() {
        this.removeKeywords(await user_data_1.default.getMutedKeywords());
    }
    ;
    /**
     * Returns the objs in the list sorted by numAccounts if it exists, otherwise by numToots,
     * and then by name. If maxObjs is provided, returns only the top maxObjs objects.
     * @param {number} [maxObjs] - Optional maximum number of objects to return.
     * @returns {T[]} Objects sorted by numAccounts if it exists, otherwise numToots, then by name
     */
    topObjs(maxObjs) {
        const sortBy = (this.objs.every(t => t.numAccounts) ? "numAccounts" : "numToots");
        const sortByAndName = [sortBy, "name"];
        this.objs = (0, collection_helpers_1.sortObjsByProps)(Object.values(this.objs), sortByAndName, [false, true]);
        return maxObjs ? this.objs.slice(0, maxObjs) : this.objs;
    }
    // Lowercase the name and set the regex property if it doesn't exist.
    completeObjProperties(obj) {
        obj.name = obj.name.trim().toLowerCase();
        obj.regex ??= (0, string_helpers_1.wordRegex)(obj.name);
        return obj;
    }
    ;
    // Return a dictionary of tag names to tags
    objNameDict() {
        return this.objs.reduce((objNames, obj) => {
            objNames[obj.name] = obj;
            return objNames;
        }, {});
    }
}
exports.default = CountedList;
;
// TODO: This has to be here for circular dependency reasons
/**
 * Subclass of ObjWithCountList for lists of BooleanFilterObject objects.
 * @augments CountedList
 */
class BooleanFilterOptionList extends CountedList {
}
exports.BooleanFilterOptionList = BooleanFilterOptionList;
;
//# sourceMappingURL=counted_list.js.map