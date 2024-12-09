import { CountKey, StringNumberDict } from "./types";
export declare const IMAGE = "image";
export declare const IMAGE_EXTENSIONS: string[];
export declare const VIDEO = "video";
export declare const VIDEO_TYPES: string[];
export declare const MEDIA_TYPES: string[];
export declare function createRandomString(length: number): string;
export declare function average(values: number[]): number | undefined;
export declare function isImage(uri: string | null | undefined): boolean;
export declare function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]>;
export declare const transformKeys: <T>(data: T, transform: (key: string) => string) => T;
export declare const isRecord: (x: unknown) => x is Record<string, unknown>;
export declare const incrementCount: (counts: StringNumberDict, key?: CountKey | null) => StringNumberDict;
export declare function countValues<T>(items: T[], getKey: (item: T) => string): StringNumberDict;
