import { Logger } from '../helpers/logger';
import { type ObjWithTootCount, type ObjListDataSource, type ObjNames, type StringNumberDict } from "../types";
export type ObjList = ObjWithCountList<ObjWithTootCount>;
export default class ObjWithCountList<T extends ObjWithTootCount> {
    logger: Logger;
    length: number;
    nameDict: ObjNames;
    source: ObjListDataSource;
    private _objs;
    constructor(objs: T[], label: ObjListDataSource);
    static buildFromDict(dict: StringNumberDict, label: ObjListDataSource): ObjList;
    get objs(): T[];
    set objs(theTags: T[]);
    filter(predicate: (obj: T) => boolean): ObjWithCountList<T>;
    getObj(name: string): ObjWithTootCount | undefined;
    map(callback: (obj: T, i?: number) => any): T[];
    maxNumAccounts(): number | undefined;
    maxNumToots(): number | undefined;
    nameToNumTootsDict(): StringNumberDict;
    removeKeywords(keywords: string[]): void;
    removeMutedTags(): Promise<void>;
    topObjs(maxObjs?: number): T[];
    private objNameDict;
}
export declare function buildObjWithTootCount(name: string, numToots: number): ObjWithTootCount;
export declare function completeObjWithTootCounts(obj: ObjWithTootCount): ObjWithTootCount;
