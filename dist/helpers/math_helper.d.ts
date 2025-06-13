import { type OptionalNumber, type StringNumberDict } from "../types";
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
export declare const isNumberOrNumberString: (n: string | OptionalNumber) => boolean;
export declare function sizeFromTextEncoder(obj: object): number;
export declare function sizeFromBufferByteLength(obj: object): number;
export declare function sizeOf(obj: unknown, sizes: BytesDict): number;
