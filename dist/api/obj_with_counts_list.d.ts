import { Logger } from '../helpers/logger';
import { type ObjWithTootCount, type ObjListDataSource, type StringNumberDict } from "../types";
import { ScoreName } from "../enums";
export type ObjList = ObjWithCountList<ObjWithTootCount>;
export type ListSource = ObjListDataSource | ScoreName.DIVERSITY;
export default class ObjWithCountList<T extends ObjWithTootCount> {
    logger: Logger;
    length: number;
    nameDict: Record<string, T>;
    source: ListSource;
    private _maxNumToots?;
    private _objs;
    get maxNumToots(): number | undefined;
    get objs(): T[];
    set objs(theTags: T[]);
    constructor(objs: T[], source: ListSource);
    addObjs(objs: T[]): void;
    filter(predicate: (obj: T) => boolean): ObjWithCountList<T>;
    getObj(name: string): T | undefined;
    incrementCount(name: string, newObjDecorator?: (obj: T) => void): T;
    map(callback: (obj: T, i?: number) => any): T[];
    maxValue(propertyName: keyof T): number | undefined;
    nameToNumTootsDict(): StringNumberDict;
    populateByCountingProps<U>(objs: U[], propExtractor: (obj: U) => T): void;
    removeKeywords(keywords: string[]): void;
    removeMutedTags(): Promise<void>;
    topObjs(maxObjs?: number): T[];
    private objNameDict;
}
