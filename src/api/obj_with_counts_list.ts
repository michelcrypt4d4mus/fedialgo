/**
 * A list of things with a name and a 'numToots' property that can be used
 * somewhat interchangeably as a dictionary or a sorted list.
 */
import UserData from "./user_data";
import { isNumber } from "../helpers/math_helper";
import { Logger } from '../helpers/logger';
import { ScoreName } from "../enums";
import { sortObjsByProps } from "../helpers/collection_helpers";
import { wordRegex } from "../helpers/string_helpers";
import {
    type BooleanFilterOption,
    type NamedTootCount,
    type ObjListDataSource,
    type StringNumberDict,
} from "../types";

export type ObjList = ObjWithCountList<NamedTootCount>;
export type ListSource = ObjListDataSource | ScoreName.DIVERSITY;  // TODO: this sucks


/**
 * A generic list class for objects with a name and a 'numToots' property.
 * Supports both dictionary and sorted list operations, and provides utility methods
 * for filtering, mapping, counting, and muting/removing items by keywords or server-side filters.
 *
 * @template T extends NamedTootCount
 * @property {Logger} logger - Logger instance for this list.
 * @property {number} length - The number of objects in the list.
 * @property {Record<string, T>} nameDict - Dictionary mapping object names to objects.
 * @property {ListSource} source - The source of the list (for logging/context).
 * @property {number | undefined} maxNumToots - The maximum numToots value in the list.
 * @property {T[]} objs - The array of objects in the list.
 */
export default class ObjWithCountList<T extends NamedTootCount> {
    logger: Logger;
    length: number;
    nameDict: Record<string, T> = {};  // Dict of obj.names to objs
    source: ListSource;

    get maxNumToots(): number | undefined { return this._maxNumToots };
    get objs(): T[] { return this._objs };
    private _maxNumToots?: number; // Cached max numToots value, if it exists
    private _objs: T[];

    // Has side effect of mutating the 'tagNames' dict property
    public set objs(objs: T[]) {
        this._objs = objs;
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
        this._maxNumToots = this.maxValue("numToots");
    }

    constructor(objs: T[], source: ListSource) {
        objs.forEach(obj => this.completeObjWithTootCounts(obj));
        this._objs = objs;
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
        this.source = source;
        this.logger = new Logger("ObjWithCountList", source);
    }

    // Add objects we don't already have. This does NOT set the numToots property on incoming objs!
    addObjs(objs: T[]): void {
        this.objs = [...this.objs, ...objs.filter(obj => !this.nameDict[obj.name])];
    }

    // Remove elements that don't match the predicate(). Returns a new ObjWithCountList object
    filter(predicate: (obj: T) => boolean): ObjWithCountList<T> {
        return new ObjWithCountList<T>(this.objs.filter(predicate), this.source);
    }

    /**
     * Returns the object in the list with the given name, or undefined if not found.
     * Name matching is case-insensitive.
     * @param {string} name - The name of the object to retrieve.
     * @returns {T | undefined} The object with the specified name, or undefined if not found.
     */
    getObj(name: string): T | undefined {
        return this.nameDict[name.toLowerCase()];
    }

    // Increment numToots for the given name. If no obj with 'name' exists create a new one
    // and call the decorator function on the new function if provided.
    incrementCount(name: string, newObjDecorator?: (obj: T) => void): T {
        let option = this.nameDict[name];

        if (!option) {
            option = { name, numToots: 0 } as T;
            this.nameDict[name] = option;
            this.objs.push(option);
            newObjDecorator?.(option);
        }

        option.numToots = (option.numToots || 0) + 1;
        return option;
    }

    // Standard map function that applies a callback to each object in the objs array
    map<U>(callback: (obj: T, i?: number) => U): U[] {
        return this.objs.map((obj, i) => callback(obj, i));
    }

    // Get the maximum value for a given key across the objs array
    maxValue(propertyName: keyof T): number | undefined {
        const values = this.objs.map(obj => obj[propertyName]).filter(n => isNumber(n));
        return values.length ? Math.max(...values as number[]) : undefined;
    }

    // Returns a dict of tag names to numToots, which is (for now) what is used by BooleanFilter
    nameToNumTootsDict(): StringNumberDict {
        return this.objs.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {} as StringNumberDict);
    }

    // Populate the objs array by counting the number of times each 'name' (given by propExtractor) appears
    // Resulting BooleanFilterOptions will be decorated with properties returned by propExtractor().
    populateByCountingProps<U>(objs: U[], propExtractor: (obj: U) => T): void {
        this.logger.deep(`populateByCountingProps() - Counting properties in ${objs.length} objects...`);

        const options = objs.reduce((optionDict, obj) => {
            const extractedProps = propExtractor(obj);
            optionDict[extractedProps.name] ??= extractedProps;
            optionDict[extractedProps.name].numToots = (optionDict[extractedProps.name].numToots || 0) + 1;
            return optionDict;
        }, {} as Record<string, T>);

        this.objs = Object.values(options);
    }

    // Remove tags that match any of the keywords
    removeKeywords(keywords: string[]): void {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validObjs = this.objs.filter(tag => !keywords.includes(tag.name));
        this.logger.logArrayReduction(this.objs, validObjs, "Tag", `matching keywords`);//  "${keywords}"`);
        this.objs = validObjs;
    };

    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags(): Promise<void> {
        this.removeKeywords(await UserData.getMutedKeywords());
    };

    /**
     * Returns the object in the list with the given name, or undefined if not found.
     * Name matching is case-insensitive.
     * @param {number} [maxObjs] - Optional maximum number of objects to return.
     * @returns {T[]]} Objects sorted by numAccounts if it exists, otherwise numToots, then by name
     */
    topObjs(maxObjs?: number): T[] {
        const sortBy = (this.objs.every(t => t.numAccounts) ? "numAccounts" : "numToots");
        const sortByAndName = [sortBy, "name"] as (keyof T)[]
        this.objs = sortObjsByProps(Object.values(this.objs), sortByAndName, [false, true]);
        return maxObjs ? this.objs.slice(0, maxObjs) : this.objs;
    }

    // Lowercase the name and set the regex property if it doesn't exist.
    private completeObjWithTootCounts(obj: T): void {
        obj.name = obj.name.toLowerCase();
        obj.regex ||= wordRegex(obj.name);
    };

    // Return a dictionary of tag names to tags
    private objNameDict(): Record<string, T> {
        return this.objs.reduce((objNames, obj) => {
            objNames[obj.name] = obj;
            return objNames;
        }, {} as Record<string, T>);
    }
};


/**
 * Special case of ObjWithCountList for BooleanFilterOption objects.
 * @extends {ObjWithCountList<BooleanFilterOption>}
 */
export class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {};
