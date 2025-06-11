import { Logger } from '../helpers/logger';
import { ScoreName } from "../enums";
import { type BooleanFilterOption, type NamedTootCount, type ObjListDataSource, type StringNumberDict } from "../types";
export type ObjList = ObjWithCountList<NamedTootCount>;
export type ListSource = ObjListDataSource | ScoreName.DIVERSITY;
/**
 * A generic list class for objects with a name and a 'numToots' property.
 * Supports both dictionary and sorted list operations, and provides utility methods
 * for filtering, mapping, counting, and muting/removing items by keywords or server-side filters.
 *
 * @template T extends NamedTootCount
 * @property {number} length - The number of objects in the list.*
 * @property {Logger} logger - Logger instance for this list.
 * @property {Record<string, T>} nameDict - Dictionary mapping object names to objects.
 * @property {ListSource} source - The source of the list (for logging/context).
 * @property {number | undefined} maxNumToots - The maximum numToots value in the list.
 * @property {T[]} objs - The array of objects in the list.
 */
export default class ObjWithCountList<T extends NamedTootCount> {
    length: number;
    logger: Logger;
    nameDict: Record<string, T>;
    source: ListSource;
    get maxNumToots(): number | undefined;
    get objs(): T[];
    private _maxNumToots?;
    private _objs;
    set objs(objs: T[]);
    constructor(objs: T[], source: ListSource);
    addObjs(objs: T[]): void;
    filter(predicate: (obj: T) => boolean): ObjWithCountList<T>;
    /**
     * Returns the object in the list with the given name, or undefined if not found.
     * Name matching is case-insensitive.
     * @param {string} name - The name of the object to retrieve.
     * @returns {T | undefined} The object with the specified name, or undefined if not found.
     */
    getObj(name: string): T | undefined;
    incrementCount(name: string, newObjDecorator?: (obj: T) => void): T;
    map<U>(callback: (obj: T, i?: number) => U): U[];
    /**
     * Get the maximum value for a given key across the objs array
     * @returns {number | undefined} The maximum value for the specified property, or undefined if none exist.
     */
    maxValue(propertyName: keyof T): number | undefined;
    /**
     * Returns a dict of 'obj.name' to 'obj.numToots'.
     * @returns {StringNumberDict} Dictionary mapping object names to their numToots counts.
     */
    nameToNumTootsDict(): StringNumberDict;
    /**
     * Populate the objs array by counting the number of times each 'name' (given by propExtractor) appears
     * Resulting BooleanFilterOptions will be decorated with properties returned by propExtractor().
     * @template U - Type of the objects in the input array.*
     * @param {U[]} objs - Array of objects to count properties from.
     * @param {(obj: U) => T} propExtractor - Function to extract the properties to count from each object.
     * @returns {void}
     */
    populateByCountingProps<U>(objs: U[], propExtractor: (obj: U) => T): void;
    /**
     * Remove any obj whose 'name' is watches any of 'keywords'.
     * @returns {Promise<void>}
     */
    removeKeywords(keywords: string[]): void;
    /**
     * Remove any obj whose 'name' is muted by the user's server side filters.
     * TODO: use UserData's cached muted keywords regex?
     * @returns {Promise<void>}
     */
    removeMutedTags(): Promise<void>;
    /**
     * Returns the objs in the list sorted by numAccounts if it exists, otherwise by numToots,
     * and then by name. If maxObjs is provided, returns only the top maxObjs objects.
     * @param {number} [maxObjs] - Optional maximum number of objects to return.
     * @returns {T[]} Objects sorted by numAccounts if it exists, otherwise numToots, then by name
     */
    topObjs(maxObjs?: number): T[];
    private completeObjWithTootCounts;
    private objNameDict;
}
export declare class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {
}
