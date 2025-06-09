import { Logger } from '../helpers/logger';
import { ScoreName } from "../enums";
import { type NamedTootCount, type ObjListDataSource, type StringNumberDict } from "../types";
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
    maxValue(propertyName: keyof T): number | undefined;
    nameToNumTootsDict(): StringNumberDict;
    populateByCountingProps<U>(objs: U[], propExtractor: (obj: U) => T): void;
    removeKeywords(keywords: string[]): void;
    removeMutedTags(): Promise<void>;
    /**
     * Returns the object in the list with the given name, or undefined if not found.
     * Name matching is case-insensitive.
     * @param {number} [maxObjs] - Optional maximum number of objects to return.
     * @returns {T[]} Objects sorted by numAccounts if it exists, otherwise numToots, then by name
     */
    topObjs(maxObjs?: number): T[];
    private completeObjWithTootCounts;
    private objNameDict;
}
