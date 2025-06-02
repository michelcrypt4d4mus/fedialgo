import { Logger } from '../helpers/logger';
import { type NamedObjWithTootCount, type ObjNames, type StringNumberDict } from "../types";
export type ObjList = ObjWithCountList<NamedObjWithTootCount>;
export default class ObjWithCountList<T extends NamedObjWithTootCount> {
    label?: string;
    logger: Logger;
    length: number;
    nameDict: ObjNames;
    private _objs;
    constructor(objs: T[], label?: string);
    static buildFromDict(dict: StringNumberDict, label?: string): ObjList;
    get objs(): T[];
    set objs(theTags: T[]);
    filter(predicate: (obj: T) => boolean): ObjWithCountList<T>;
    getObj(name: string): NamedObjWithTootCount | undefined;
    map(callback: (obj: T) => any): T[];
    maxNumAccounts(): number | undefined;
    maxNumToots(): number | undefined;
    nameToNumTootsDict(): StringNumberDict;
    removeKeywords(keywords: string[]): void;
    removeMutedTags(): Promise<void>;
    topObjs(maxObjs?: number): T[];
    private objNameDict;
}
export declare function buildObjWithTootCount(name: string, numToots: number): NamedObjWithTootCount;
export declare function completeObjWithTootCounts(obj: NamedObjWithTootCount): NamedObjWithTootCount;
