/*
 * Base class for lists of things with a name and a 'numToots' property that can be used
 * somewhat interchangeably as a dictionary or a sorted list.
 */
import { isFinite, isNil } from "lodash";

import { Logger } from '../helpers/logger';
import { sortObjsByProps } from "../helpers/collection_helpers";
import { wordRegex } from "../helpers/string_helpers";
import {
    type BooleanFilterOption,
    type CountedListSource,
    type NamedTootCount,
    type StringNumberDict,
} from "../types";

/** Generic version of CountedList. */
export type ObjList = CountedList<NamedTootCount>;


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
export default class CountedList<T extends NamedTootCount> {
    logger: Logger;
    nameDict: Record<string, T> = {};  // Dict of obj.names to objs
    source: CountedListSource;

    get length() { return this._objs.length };
    get maxNumToots() { return this.maxValue("numToots" as keyof T) };
    get objs() { return this._objs };
    private _objs: T[] = [];

    /** Has side effect of mutating the {@linkcode CountedList.nameDict} property. */
    public set objs(objs: T[]) {
        this._objs = objs.map(this.completeObjProperties);

        this.nameDict = this.objs.reduce((objNames, obj) => {
            objNames[obj.name] = obj;
            return objNames;
        }, {} as Record<string, T>);
    }

    /**
     * @param objs - Array of objects to initialize the list with.
     * @param {CountedListSource} source - Source of the list (for logging/context).
     */
    constructor(objs: T[], source: CountedListSource) {
        this.objs = objs;
        this.source = source;
        this.logger = new Logger("CountedList", source);
    }

    /**
     * Add objects we don't already have. This does NOT set the {@linkcode numToots} property on incoming objs!
     * @param {T[]} objs - Array of objects to add to the list.
     */
    addObjs(objs: T[]): void {
        const numObjsBefore = this.length;
        const addableObjs = objs.filter(obj => !this.nameDict[obj.name]).map(this.completeObjProperties.bind(this));
        this.objs = [...this.objs, ...addableObjs];
        this.logger.trace(`addObjs() added ${addableObjs.length} of ${objs.length} incoming objs to initial ${numObjsBefore}:`, addableObjs);
    }

    /**
     * Like the standard javascript {@linkcode Array.filter}.
     * @param {function} predicate - Function to test each object in the list.
     * @returns {CountedList<T>} A new CountedList containing only the objects that match the predicate.
     */
    filter(predicate: (obj: T) => boolean): CountedList<T> {
        return new CountedList<T>(this.objs.filter(predicate), this.source);
    }

    /** Standard {@linkcode Array.forEach} approximation that invokes a callback for each object in the objs array. */
    forEach(callback: (obj: T, i?: number) => void): void {
        this.objs.forEach((obj, i) => callback(obj, i));
    }

    /**
     * Returns the object in the list with the given name (case-insensitive) if it exists.
     * @param {string} name - The name of the object to retrieve.
     * @returns {T | undefined} The object with the specified name, or undefined if not found.
     */
    getObj(name: string): T | undefined {
        return this.nameDict[name.toLowerCase()];
    }

    /**
     * Increment numToots for the given 'name'. If no obj with 'name' exists create a new one
     * and call newObjDecorator() to get its properties.
     * @param {string} name - The name of the object to increment.
     * @param {(obj: T) => void} [newObjDecorator] - Optional function to decorate the new object with additional properties.
     * @returns {T} The object with the incremented numToots.
     */
    incrementCount(name: string, newObjDecorator?: (obj: T) => void): T {
        let obj = this.nameDict[name];

        if (!obj) {
            obj = this.completeObjProperties({ name, numToots: 0 } as T);
            this.nameDict[name] = obj;
            this.objs.push(obj);
            newObjDecorator?.(obj);
        }

        obj.numToots = (obj.numToots || 0) + 1;
        return obj;
    }

    /** Standard map function that applies a callback to each object in the objs array. */
    map<U>(callback: (obj: T, i?: number) => U): U[] {
        return this.objs.map((obj, i) => callback(obj, i));
    }

    /**
     * Get the maximum value for a given key across the {@linkcode CountedList.objs} array.
     * @template T
     * @param {keyof T} propertyName - The property to find the maximum value for.
     * @returns {number | undefined} The maximum value for the specified property, or undefined if none exist.
     */
    maxValue(propertyName: keyof T): number | undefined {
        const values = this.objs.map(obj => obj[propertyName]).filter(n => isFinite(n));
        return values.length ? Math.max(...values as number[]) : undefined;
    }

    /**
     * Returns a dict of {@linkcode obj.name} to {@linkcode obj.numToots}.
     * @returns {StringNumberDict} Dictionary mapping object names to their numToots counts.
     */
    nameToNumTootsDict(): StringNumberDict {
        return this.objs.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {} as StringNumberDict);
    }

    /**
     * Populate the objs array by counting the number of times each 'name' (given by propExtractor) appears.
     * Resulting {@linkcode BooleanFilterOption}s will be decorated with properties returned by propExtractor().
     * @template U - Type of the objects in the input array.*
     * @param {U[]} objs - Array of objects to count properties from.
     * @param {(obj: U) => T} propExtractor - Function to extract the decorator properties for the counted objects.
     */
    populateByCountingProps<U>(objs: U[], propExtractor: (obj: U) => T): void {
        this.logger.deep(`populateByCountingProps() - Counting properties in ${objs.length} objects...`);

        const options = objs.reduce(
            (objsWithCounts, obj) => {
                const extractedProps = propExtractor(obj);
                objsWithCounts[extractedProps.name] ??= extractedProps;
                objsWithCounts[extractedProps.name].numToots = (objsWithCounts[extractedProps.name].numToots || 0) + 1;
                return objsWithCounts;
            },
            {} as Record<string, T>
        );

        this.objs = Object.values(options);
    }

    /**
     * Remove any obj whose 'name' is watches any of 'keywords'.
     * @param {string[]} keywords - Array of keywords to match against the object's name.
     */
    removeKeywords(keywords: string[]): void {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validObjs = this.objs.filter(tag => !keywords.includes(tag.name));
        this.logger.logArrayReduction(this.objs, validObjs, "Tag", `matching keywords`);//  "${keywords}"`);
        this.objs = validObjs;
    };

    /**
     * Returns the objs in the list sorted by numAccounts if it exists, otherwise by numToots,
     * and then by name. If maxObjs is provided, returns only the top maxObjs objects.
     * @param {number} [maxObjs] - Optional maximum number of objects to return.
     * @returns {T[]} Objects sorted by numAccounts if it exists, otherwise numToots, then by name
     */
    topObjs(maxObjs?: number): T[] {
        const sortBy: keyof T = this.objs.every(t => !isNil(t.numAccounts)) ? "numAccounts" : "numToots";
        const validObjs = this.objs.filter(t => (t[sortBy] as number || 0) > 0);
        this.logger.trace(`topObjs() sorting by "${sortBy.toString()}" then by "name"`);
        const sortByAndName: (keyof T)[] = [sortBy, "name"];
        const sortedObjs = sortObjsByProps(validObjs, sortByAndName, [false, true]);
        this.logger.trace(`topObjs() sorted ${this.objs.length} first 100 objs:`, sortedObjs.slice(0, 100));
        return maxObjs ? sortedObjs.slice(0, maxObjs) : sortedObjs;
    }

    // Lowercase the name and set the regex property if it doesn't exist.
    private completeObjProperties(obj: T): T {
        obj.name = obj.name.trim().toLowerCase();
        obj.regex ??= wordRegex(obj.name);
        return obj;
    }
};


// TODO: This has to be here for circular dependency reasons
/**
 * Subclass of CountedList for lists of BooleanFilterObject objects.
 * @augments CountedList
 */
export class BooleanFilterOptionList extends CountedList<BooleanFilterOption> {};
