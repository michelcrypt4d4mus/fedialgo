/*
 * A list of things with a name and a 'numToots' property that can be used
 * somewhat interchangeably as a dictionary or a sorted list.
 */
import UserData from "./user_data";
import { isNull, wordRegex } from "../helpers/string_helpers";
import { isNumber } from "../helpers/math_helper";
import { Logger } from '../helpers/logger';
import { sortObjsByProps } from "../helpers/collection_helpers";
import {
    type ObjWithTootCount,
    type ObjListDataSource,
    type StringNumberDict,
} from "../types";
import { ScoreName } from "../enums";

export type ObjList = ObjWithCountList<ObjWithTootCount>;
export type ListSource = ObjListDataSource | ScoreName.DIVERSITY;  // TODO: this sucks

const logger = new Logger("TagList");


export default class ObjWithCountList<T extends ObjWithTootCount> {
    logger: Logger;
    length: number;
    nameDict: Record<string, T> = {};  // Dict of obj.names to objs
    source: ListSource;
    private _maxNumToots?: number; // Cached max numToots value, if it exists
    private _objs: T[];

    public get maxNumToots(): number | undefined {
        return this._maxNumToots;
    }

    public get objs(): T[] {
        return this._objs;
    }

    // Has side effect of mutating the 'tagNames' dict property
    public set objs(theTags: T[]) {
        this._objs = theTags;
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
        this._maxNumToots = this.maxValue("numToots");
    }

    constructor(objs: T[], source: ListSource) {
        this._objs = objs.map(completeObjWithTootCounts) as T[];
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

    // Return the tag if it exists in 'tags' array, otherwise undefined.
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
        this.logger.trace(`populateByCountingProps() - Counting properties in ${objs.length} objects...`);

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
        this.logger.logArrayReduction(this.objs, validObjs, "tags", `matching keywords`);//  "${keywords}"`);
        this.objs = validObjs;
    };

    // Screen a list of hashtags against the user's server side filters, removing any that are muted.
    async removeMutedTags(): Promise<void> {
        this.removeKeywords(await UserData.getMutedKeywords());
    };

    // Return numTags tags sorted by numAccounts if it exists, otherwise numToots, then by name
    // If 'numTags' is not set return all tags.
    topObjs(maxObjs?: number): T[] {
        const sortBy = (this.objs.every(t => t.numAccounts) ? "numAccounts" : "numToots");
        const sortByAndName = [sortBy, "name"] as (keyof T)[]
        this.objs = sortObjsByProps(Object.values(this.objs), sortByAndName, [false, true]);
        return maxObjs ? this.objs.slice(0, maxObjs) : this.objs;
    }

    // Return a dictionary of tag names to tags
    private objNameDict(): Record<string, T> {
        return this.objs.reduce((objNames, obj) => {
            objNames[obj.name] = obj;
            return objNames;
        }, {} as Record<string, T>);
    }
};


function completeObjWithTootCounts(obj: ObjWithTootCount): ObjWithTootCount {
    obj.name = obj.name.toLowerCase();
    obj.regex ||= wordRegex(obj.name);
    return obj;
};
