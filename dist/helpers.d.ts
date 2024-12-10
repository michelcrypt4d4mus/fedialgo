import { CountKey, StringNumberDict } from "./types";
export declare const IMAGE = "image";
export declare const IMAGE_EXTENSIONS: string[];
export declare const VIDEO = "video";
export declare const VIDEO_TYPES: string[];
export declare const MEDIA_TYPES: string[];
export declare function average(values: number[]): number;
export declare function isImage(uri: string | null | undefined): boolean;
export declare function groupBy<T>(array: T[], makeKey: (item: T) => string): Record<string, T[]>;
export declare function transformKeys<T>(data: T, transform: (key: string) => string): T;
export declare function incrementCount(counts: StringNumberDict, key?: CountKey | null): StringNumberDict;
export declare function countValues<T>(items: T[], getKey?: (item: T) => string | null | undefined, countNulls?: boolean): StringNumberDict;
export declare function zipArrays<T>(array1: string[], array2: T[]): Record<string, T>;
export declare function zipPromises<T>(args: string[], promiser: (s: string) => Promise<T>): Promise<Record<string, T>>;
export declare function sortKeysByValue(dict: StringNumberDict): string[];
export declare function atLeastValues(obj: StringNumberDict, minValue: number): StringNumberDict;
export declare function createRandomString(length: number): string;
