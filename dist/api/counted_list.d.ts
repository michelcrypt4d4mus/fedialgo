import { Logger } from '../helpers/logger';
import { type BooleanFilterOption, type CountedListSource, type NamedTootCount, type StringNumberDict } from "../types";
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
    nameDict: Record<string, T>;
    source: CountedListSource;
    get length(): number;
    get maxNumToots(): number | undefined;
    get objs(): T[];
    private _objs;
    /** Has side effect of mutating the {@linkcode CountedList.nameDict} property. */
    set objs(objs: T[]);
    /**
     * @param objs - Array of objects to initialize the list with.
     * @param {CountedListSource} source - Source of the list (for logging/context).
     */
    constructor(objs: T[], source: CountedListSource);
    /**
     * Add objects we don't already have. This does NOT set the {@linkcode numToots} property on incoming objs!
     * @param {T[]} objs - Array of objects to add to the list.
     */
    addObjs(objs: T[]): void;
    /**
     * Like the standard javascript {@linkcode Array.filter()}.
     * @param {function} predicate - Function to test each object in the list.
     * @returns {CountedList<T>} A new CountedList containing only the objects that match the predicate.
     */
    filter(predicate: (obj: T) => boolean): CountedList<T>;
    /** Standard {@linkcode Array.forEach} approximation that invokes a callback for each object in the objs array. */
    forEach(callback: (obj: T, i?: number) => void): void;
    /**
     * Returns the object in the list with the given name (case-insensitive) if it exists.
     * @param {string} name - The name of the object to retrieve.
     * @returns {T | undefined} The object with the specified name, or undefined if not found.
     */
    getObj(name: string): T | undefined;
    /**
     * Increment {@linkcode numToots} for the given {@linkcode name}. If no obj with {@linkcode name} exists c
     * reate a new one and call {@linkcode newObjDecorator()} to get its properties.
     * @param {string} name - The name of the object to increment.
     * @param {(obj: T) => void} [newObjDecorator] - Optional function to decorate the new object with additional properties.
     * @returns {T} The object with the incremented numToots.
     */
    incrementCount(name: string, newObjDecorator?: (obj: T) => void): T;
    /** Standard map function that applies a callback to each object in the objs array. */
    map<U>(callback: (obj: T, i?: number) => U): U[];
    /**
     * Get the maximum value for a given key across the {@linkcode CountedList.objs} array.
     * @template T
     * @param {keyof T} propertyName - The property to find the maximum value for.
     * @returns {number | undefined} The maximum value for the specified property, or undefined if none exist.
     */
    maxValue(propertyName: keyof T): number | undefined;
    /**
     * Returns a dict of {@linkcode obj.name} to {@linkcode obj.numToots}.
     * @returns {StringNumberDict} Dictionary mapping object names to their numToots counts.
     */
    nameToNumTootsDict(): StringNumberDict;
    /**
     * Populate the objs array by counting the number of times each 'name' (given by {@linkcode propExtractor})
     * appears. Resulting {@linkcode BooleanFilterOption}s will be decorated with properties returned by
     * {@linkcode propExtractor()}.
     * @template U - Type of the objects in the input array.*
     * @param {U[]} objs - Array of objects to count properties from.
     * @param {(obj: U) => T} propExtractor - Function to extract the decorator properties for the counted objects.
     */
    populateByCountingProps<U>(objs: U[], propExtractor: (obj: U) => T): void;
    /**
     * Remove any obj whose {@linkcode name} matches any of the {@linkcode keywords}.
     * @param {string[]} keywords - Array of keywords to match against the object's name.
     */
    removeKeywords(keywords: string[]): void;
    /**
     * Returns the objs in the list sorted by {@linkcode numAccounts} if it exists, otherwise
     * by {@linkcode numToots}, and then by name. If {@linkcode maxObjs} is provided, returns
     * only the top {@linkcode maxObjs} objects.
     * @param {number} [maxObjs] - Optional maximum number of objects to return.
     * @returns {T[]} Objects sorted by {@linkcode numAccounts} if it exists, otherwise {@linkcode numToots}, then by name
     */
    topObjs(maxObjs?: number): T[];
    private completeObjProperties;
}
/**
 * Subclass of {@linkcode CountedList} for lists of {@linkcode BooleanFilterObject}s.
 * @augments CountedList
 */
export declare class BooleanFilterOptionList extends CountedList<BooleanFilterOption> {
}
