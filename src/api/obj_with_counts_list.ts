/*
 * A list of things with a name and a 'numToots' property that can be used
 * somewhat interchangeably as a dictionary or a sorted list.
 */
import UserData from "./user_data";
import { isNull, wordRegex } from "../helpers/string_helpers";
import { Logger } from '../helpers/logger';
import { sortObjsByProps } from "../helpers/collection_helpers";
import {
    type NamedObjWithTootCount,
    type ObjNames,
    type StringNumberDict,
} from "../types";

export type ObjList = ObjWithCountList<NamedObjWithTootCount>;

const logger = new Logger("TagList");


export default class ObjWithCountList<T extends NamedObjWithTootCount> {
    label?: string;
    logger: Logger;
    length: number;
    nameDict: ObjNames = {};  // Dict of tag names to tags
    private _objs: T[];

    constructor(objs: T[], label?: string) {
        this._objs = objs.map(completeObjWithTootCounts) as T[];
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
        this.label = label;
        this.logger = label ? new Logger(label, "TagList") : logger;
    }

    // Alternate constructor to create synthetic tags
    static buildFromDict(dict: StringNumberDict, label?: string): ObjList {
        const objs = Object.entries(dict).map(([name, numToots]) => {
            const obj: NamedObjWithTootCount = { name, numToots, url: "blank" };
            return obj;
        });

        return new ObjWithCountList(objs, label);
    }

    public get objs(): T[] {
        return this._objs;
    }

    // Has side effect of mutating the 'tagNames' dict property
    public set objs(theTags: T[]) {
        this._objs = theTags;
        this.length = this._objs.length;
        this.nameDict = this.objNameDict();
    }

    // Remove elements that don't match the predicate(). Returns a new ObjWithCountList object
    filter(predicate: (obj: T) => boolean): ObjWithCountList<T> {
        return new ObjWithCountList(this.objs.filter(predicate));
    }

    // Return the tag if it exists in 'tags' array, otherwise undefined.
    getObj(name: string): NamedObjWithTootCount | undefined {
        return this.nameDict[name.toLowerCase()];
    }

    map(callback: (obj: T) => any): T[] {
        return this.objs.map(callback);
    }

    // Find the maximum numAccounts property in objs
    maxNumAccounts(): number | undefined {
        const objsNumAccounts = this.objs.map(t => t.numAccounts).filter(n => !isNull(n) && !isNaN(n!));
        return objsNumAccounts.length ? Math.max(...objsNumAccounts as number[]) : undefined
    }

    // Find the maximum numToots property in objs
    maxNumToots(): number | undefined {
        const tagsNumToots = this.objs.map(t => t.numToots).filter(n => !isNull(n) && !isNaN(n!));
        return tagsNumToots.length ? Math.max(...tagsNumToots as number[]) : undefined
    }

    // Returns a dict of tag names to numToots, which is (for now) what is used by BooleanFilter
    nameToNumTootsDict(): StringNumberDict {
        return this.objs.reduce((dict, tag) => {
            dict[tag.name] = tag.numToots || 0;
            return dict;
        }, {} as StringNumberDict);
    }

    // Remove tags that match any of the keywords
    removeKeywords(keywords: string[]): void {
        keywords = keywords.map(k => (k.startsWith('#') ? k.slice(1) : k).toLowerCase().trim());
        const validObjs = this.objs.filter(tag => !keywords.includes(tag.name));
        this.logger.logArrayReduction(this.objs, validObjs, "tags", `matching keywords "${keywords}"`);
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
    private objNameDict(): ObjNames {
        return this.objs.reduce((objNames, obj) => {
            objNames[obj.name] = obj;
            return objNames;
        }, {} as ObjNames);
    }
};


export function buildObjWithTootCount(name: string, numToots: number): NamedObjWithTootCount {
    const obj: NamedObjWithTootCount = { name, numToots };
    return completeObjWithTootCounts(obj);
};


export function completeObjWithTootCounts(obj: NamedObjWithTootCount): NamedObjWithTootCount {
    obj.name = obj.name.toLowerCase();
    obj.regex ||= wordRegex(obj.name);
    return obj;
};
