import { Logger } from '../helpers/logger';
import { type BooleanFilterOption, type CountedListSource, type NamedTootCount, type StringNumberDict } from "../types";
export type ObjList = CountedList<NamedTootCount>;
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
export default class CountedList<T extends NamedTootCount> {
    logger: Logger;
    nameDict: Record<string, T>;
    source: CountedListSource;
    get length(): number;
    get maxNumToots(): number | undefined;
    get objs(): T[];
    private _objs;
    /** Has side effect of mutating the 'nameDict' property. */
    set objs(objs: T[]);
    /**
     * @param objs - Array of objects to initialize the list with.
     * @param {CountedListSource} source - Source of the list (for logging/context).
     */
    constructor(objs: T[], source: CountedListSource);
    addObjs(objs: T[]): void;
    /**
     * Like the standard Array.filter().
     * @param {function} predicate - Function to test each object in the list.
     * @returns {CountedList<T>} A new CountedList containing only the objects that match the predicate.
     */
    filter(predicate: (obj: T) => boolean): CountedList<T>;
    /**
     * Returns the object in the list with the given name (case-insensitive) if it exists.
     * @param {string} name - The name of the object to retrieve.
     * @returns {T | undefined} The object with the specified name, or undefined if not found.
     */
    getObj(name: string): T | undefined;
    /**
     * Increment numToots for the given 'name'. If no obj with 'name' exists create a new one
     * and call newObjDecorator() to get its properties.
     * @param {string} name - The name of the object to increment.
     * @param {(obj: T) => void} [newObjDecorator] - Optional function to decorate the new object with additional properties.
     * @returns {T} The object with the incremented numToots.
     */
    incrementCount(name: string, newObjDecorator?: (obj: T) => void): T;
    /** Standard map function that applies a callback to each object in the objs array. */
    map<U>(callback: (obj: T, i?: number) => U): U[];
    /**
     * Get the maximum value for a given key across the objs array
     * @param {keyof T} propertyName - The property to find the maximum value for.
     * @returns {number | undefined} The maximum value for the specified property, or undefined if none exist.
     */
    maxValue(propertyName: keyof T): number | undefined;
    /**
     * Returns a dict of 'obj.name' to 'obj.numToots'.
     * @returns {StringNumberDict} Dictionary mapping object names to their numToots counts.
     */
    nameToNumTootsDict(): StringNumberDict;
    /**
     * Populate the objs array by counting the number of times each 'name' (given by propExtractor) appears.
     * Resulting BooleanFilterOptions will be decorated with properties returned by propExtractor().
     * @template U - Type of the objects in the input array.*
     * @param {U[]} objs - Array of objects to count properties from.
     * @param {(obj: U) => T} propExtractor - Function to extract the decorator properties for the counted objects.
     */
    populateByCountingProps<U>(objs: U[], propExtractor: (obj: U) => T): void;
    /**
     * Remove any obj whose 'name' is watches any of 'keywords'.
     * @param {string[]} keywords - Array of keywords to match against the object's name.
     */
    removeKeywords(keywords: string[]): void;
    /**
     * Returns the objs in the list sorted by numAccounts if it exists, otherwise by numToots,
     * and then by name. If maxObjs is provided, returns only the top maxObjs objects.
     * @param {number} [maxObjs] - Optional maximum number of objects to return.
     * @returns {T[]} Objects sorted by numAccounts if it exists, otherwise numToots, then by name
     */
    topObjs(maxObjs?: number): T[];
    private completeObjProperties;
}
/**
 * Subclass of ObjWithCountList for lists of BooleanFilterObject objects.
 * @augments CountedList
 */
export declare class BooleanFilterOptionList extends CountedList<BooleanFilterOption> {
}
