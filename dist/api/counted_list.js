"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanFilterOptionList = void 0;
/*
 * Base class for lists of things with a name and a 'numToots' property that can be used
 * somewhat interchangeably as a dictionary or a sorted list.
 */
const lodash_1 = require("lodash");
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
 * @property {number | undefined} maxNumToots - The maximum numToots value in the list.*
 * @property {Record<string, T>} nameDict - Dictionary mapping object names to objects.
 * @property {T[]} objs - The array of objects in the list.
 * @property {ListSource} source - The source of the list (for logging/context).
 */
class CountedList {
    logger;
    nameDict = {}; // Dict of obj.names to objs
    source;
    get length() { return this._objs.length; }
    ;
    get maxNumToots() { return this.maxValue("numToots"); }
    ;
    get objs() { return this._objs; }
    ;
    _objs = [];
    /** Has side effect of mutating the 'nameDict' property. */
    set objs(objs) {
        this._objs = objs.map(this.completeObjProperties);
        this.nameDict = this.objs.reduce((objNames, obj) => {
            objNames[obj.name] = obj;
            return objNames;
        }, {});
    }
    /**
     * @param objs - Array of objects to initialize the list with.
     * @param {CountedListSource} source - Source of the list (for logging/context).
     */
    constructor(objs, source) {
        this.objs = objs;
        this.source = source;
        this.logger = new logger_1.Logger("CountedList", source);
    }
    /**
     * Add objects we don't already have. This does NOT set the numToots property on incoming objs!
     * @param {T[]} objs - Array of objects to add to the list.
     */
    addObjs(objs) {
        const numObjsBefore = this.length;
        const addableObjs = objs.filter(obj => !this.nameDict[obj.name]).map(this.completeObjProperties.bind(this));
        this.objs = [...this.objs, ...addableObjs];
        this.logger.debug(`addObjs() added ${addableObjs.length} of ${objs.length} incoming objs to initial ${numObjsBefore}:`, addableObjs);
    }
    /**
     * Like the standard Array.filter().
     * @param {function} predicate - Function to test each object in the list.
     * @returns {CountedList<T>} A new CountedList containing only the objects that match the predicate.
     */
    filter(predicate) {
        return new CountedList(this.objs.filter(predicate), this.source);
    }
    /** Standard Array.forEach() approximation that invokes a callback for each object in the objs array. */
    forEach(callback) {
        this.objs.forEach((obj, i) => callback(obj, i));
    }
    /**
     * Returns the object in the list with the given name (case-insensitive) if it exists.
     * @param {string} name - The name of the object to retrieve.
     * @returns {T | undefined} The object with the specified name, or undefined if not found.
     */
    getObj(name) {
        return this.nameDict[name.toLowerCase()];
    }
    /**
     * Increment numToots for the given 'name'. If no obj with 'name' exists create a new one
     * and call newObjDecorator() to get its properties.
     * @param {string} name - The name of the object to increment.
     * @param {(obj: T) => void} [newObjDecorator] - Optional function to decorate the new object with additional properties.
     * @returns {T} The object with the incremented numToots.
     */
    incrementCount(name, newObjDecorator) {
        let obj = this.nameDict[name];
        if (!obj) {
            obj = this.completeObjProperties({ name, numToots: 0 });
            this.nameDict[name] = obj;
            this.objs.push(obj);
            newObjDecorator?.(obj);
        }
        obj.numToots = (obj.numToots || 0) + 1;
        return obj;
    }
    /** Standard map function that applies a callback to each object in the objs array. */
    map(callback) {
        return this.objs.map((obj, i) => callback(obj, i));
    }
    /**
     * Get the maximum value for a given key across the objs array
     * @template T
     * @param {keyof T} propertyName - The property to find the maximum value for.
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
     * Populate the objs array by counting the number of times each 'name' (given by propExtractor) appears.
     * Resulting BooleanFilterOptions will be decorated with properties returned by propExtractor().
     * @template U - Type of the objects in the input array.*
     * @param {U[]} objs - Array of objects to count properties from.
     * @param {(obj: U) => T} propExtractor - Function to extract the decorator properties for the counted objects.
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
     * @param {string[]} keywords - Array of keywords to match against the object's name.
     */
    removeKeywords(keywords) {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validObjs = this.objs.filter(tag => !keywords.includes(tag.name));
        this.logger.logArrayReduction(this.objs, validObjs, "Tag", `matching keywords`); //  "${keywords}"`);
        this.objs = validObjs;
    }
    ;
    /**
     * Returns the objs in the list sorted by numAccounts if it exists, otherwise by numToots,
     * and then by name. If maxObjs is provided, returns only the top maxObjs objects.
     * @param {number} [maxObjs] - Optional maximum number of objects to return.
     * @returns {T[]} Objects sorted by numAccounts if it exists, otherwise numToots, then by name
     */
    topObjs(maxObjs) {
        const sortBy = this.objs.every(t => !(0, lodash_1.isNil)(t.numAccounts)) ? "numAccounts" : "numToots";
        const validObjs = this.objs.filter(t => (t[sortBy] || 0) > 0);
        this.logger.trace(`topObjs() sorting by "${sortBy.toString()}" then by "name"`);
        const sortByAndName = [sortBy, "name"];
        const sortedObjs = (0, collection_helpers_1.sortObjsByProps)(validObjs, sortByAndName, [false, true]);
        this.logger.trace(`topObjs() sorted ${this.objs.length} first 100 objs:`, sortedObjs.slice(0, 100));
        return maxObjs ? sortedObjs.slice(0, maxObjs) : sortedObjs;
    }
    // Lowercase the name and set the regex property if it doesn't exist.
    completeObjProperties(obj) {
        obj.name = obj.name.trim().toLowerCase();
        obj.regex ??= (0, string_helpers_1.wordRegex)(obj.name);
        return obj;
    }
}
exports.default = CountedList;
;
// TODO: This has to be here for circular dependency reasons
/**
 * Subclass of CountedList for lists of BooleanFilterObject objects.
 * @augments CountedList
 */
class BooleanFilterOptionList extends CountedList {
}
exports.BooleanFilterOptionList = BooleanFilterOptionList;
;
//# sourceMappingURL=counted_list.js.map