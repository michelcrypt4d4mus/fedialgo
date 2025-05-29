import { StringNumberDict } from "../types";
export declare const isNumber: (n: string | number) => boolean;
export declare class BytesDict {
    arrays: number;
    booleans: number;
    functions: number;
    keys: number;
    numbers: number;
    strings: number;
    objects: number;
    toDict(): StringNumberDict;
    toBytesStringDict(): Record<string, string>;
}
