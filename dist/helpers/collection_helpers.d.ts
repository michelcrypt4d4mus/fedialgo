import { CountKey, MastodonObjWithID, MinMax, MinMaxID, CacheKey, StringNumberDict, Weights } from "../types";
export declare function atLeastValues(obj: StringNumberDict, minValue: number): StringNumberDict;
export declare function average(values: number[]): number;
export declare function batchMap<T>(array: T[], fxn: (e: T) => Promise<any>, options?: {
    batchSize?: number;
    logPrefix?: string;
    sleepBetweenMS?: number;
}): Promise<any[]>;
export declare function makeChunks<T>(array: T[], options: {
    chunkSize?: number;
    logPrefix?: string;
    numChunks?: number;
}): T[][];
export declare function checkUniqueIDs(array: MastodonObjWithID[], label: CacheKey): void;
export declare function computeMinMax<T>(array: T[], valueFxn: (value: T) => number | undefined): MinMax | null;
export declare function countValues<T>(items: T[], getKey?: (item: T) => string | null | undefined, countNulls?: boolean): StringNumberDict;
export declare function filterWithLog<T>(array: T[], filterFxn: (value: T) => boolean, logPrefix: string, reason: string, // Describe why things were filtered
objType?: string): T[];
export declare function findMinMaxId(array: MastodonObjWithID[]): MinMaxID | undefined;
export declare function groupBy<T>(array: T[], makeKey: (item: T) => string): Record<string, T[]>;
export declare function incrementCount(counts: StringNumberDict, k?: CountKey | null, increment?: number): StringNumberDict;
export declare function decrementCount(counts: StringNumberDict, k?: CountKey | null, increment?: number): StringNumberDict;
export declare function isValueInStringEnum<E extends string>(strEnum: Record<string, E>): (value: string) => value is E;
export declare function keyByProperty<T>(array: T[], keyFxn: (value: T) => string): Record<string, T>;
export declare function percentileSegments<T>(array: T[], fxn: (element: T) => number | undefined, numPercentiles: number): T[][];
export declare function shuffle<T extends (string | number | object)>(array: T[]): T[];
export declare function sortKeysByValue(dict: StringNumberDict): string[];
export declare function sortObjsByProps<T>(array: T[], prop: keyof T | (keyof T)[], ascending?: boolean | boolean[], ignoreCase?: boolean): T[];
export declare function split<T>(array: T[], condition: (element: T) => boolean): [T[], T[]];
export declare function sumArray(arr: (number | null | undefined)[]): number;
export declare function sumValues(obj: StringNumberDict | Weights): number;
export declare function transformKeys<T>(data: T, transform: (key: string) => string): T;
export declare function truncateToConfiguredLength(array: any[], maxRecords: number, label?: string): any[];
export declare const uniquify: (array: (string | undefined)[]) => string[] | undefined;
export declare function uniquifyByProp<T>(array: T[], transform: (value: T) => string): T[];
export declare function zipArrays<T>(array1: string[], array2: T[]): Record<string, T>;
export declare function zipPromises<T>(args: string[], promiser: (s: string) => Promise<T>): Promise<Record<string, T>>;
