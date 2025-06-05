import { type StringNumberDict } from "../types";
type OptionalNumber = number | null | undefined;
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
export declare const isNumber: (n: OptionalNumber) => boolean;
export declare const isNumberOrNumberString: (n: string | OptionalNumber) => boolean;
export declare function sizeFromTextEncoder(obj: object): number;
export declare function sizeFromBufferByteLength(obj: object): number;
export declare function sizeOf(obj: any, sizes: BytesDict): number;
export {};
