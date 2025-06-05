/*
 * Math and numbers.
 */
import { byteString, isNull, isString } from "./string_helpers";
import { strBytes } from "./log_helpers";
import { sumArray } from "./collection_helpers";
import { type StringNumberDict } from "../types";

type OptionalNumber = number | null | undefined;

const NUMBER_REGEX = /^[\d.]+$/;

// For use with sizeOf() to try to see internals of object size.
// There's duplication of byte count here - arrays and objects include the other types
export class BytesDict {
    arrays: number = 0;
    booleans: number = 0;
    functions: number = 0;
    keys: number = 0;  // keys in objects
    numbers: number = 0;
    strings: number = 0;
    objects: number = 0;

    toDict(): StringNumberDict {
        return {
            arrays: this.arrays,
            booleans: this.booleans,
            functions: this.functions,
            keys: this.keys,
            numbers: this.numbers,
            strings: this.strings,
            objects: this.objects
        };
    }

    toBytesStringDict(): Record<string, string> {
        return Object.fromEntries(Object.entries(this.toDict()).map(([k, v]) => [k, byteString(v)]));
    }
};


// Returns true if it's a digits striing or if it's a number besides NaN or Infinity
export const isNumber = (n: any) => typeof n == "number" ? !isNaN(n) && isFinite(n) : false;
// Same as isNumber() but accepts a numerical string as well
export const isNumberOrNumberString = (n: string | OptionalNumber) => typeof n == "string" ? NUMBER_REGEX.test(n) : isNumber(n);


// Use TextEncoder to get the byte length of an object
export function sizeFromTextEncoder(obj: object): number {
    try {
        return new TextEncoder().encode(JSON.stringify(obj)).length;
    } catch (err) {
        console.error("sizeFromBufferByteLength() failed to encode object with error:", err, `\nobject:`, obj);
        return 0;
    }
};


// Use Buffer to get the byte length of an object
export function sizeFromBufferByteLength(obj: object): number {
    try {
        return Buffer.byteLength(JSON.stringify(obj), 'utf8');
    } catch (err) {
        console.error("sizeFromBufferByteLength() failed to encode object with error:", err, `\nobject:`, obj);
        return 0;
    }
};


// Not 100% accurate. From https://gist.github.com/rajinwonderland/36887887b8a8f12063f1d672e318e12e
export function sizeOf(obj: any, sizes: BytesDict): number {
    if (isNull(obj)) return 0;
    let bytes = 0;

    switch (typeof obj) {
        case "boolean":
            bytes += 4;
            sizes.booleans += 4;
            break;
        case "function":
            const fxnLength = strBytes(obj.toString());
            bytes += fxnLength; // functions aren't serialized in JSON i don't think?
            sizes.functions += fxnLength;
            break;
        case "number":
            bytes += 8;
            sizes.numbers += 8;
            break;
        case "string":
            const stringLength = strBytes(obj);
            bytes += stringLength;
            sizes.strings += stringLength;
            break;
        case "object":
            if (Array.isArray(obj)) {
                const arrayBytes = sumArray(obj.map((item) => sizeOf(item, sizes)));
                bytes += arrayBytes;
                sizes.arrays += arrayBytes;
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    const keyBytes = strBytes(key);
                    bytes += keyBytes;
                    sizes.strings += keyBytes;
                    sizes.keys += keyBytes; // keys in objects

                    const valueBytes = sizeOf(value, sizes);
                    bytes += valueBytes;
                    sizes.objects += valueBytes; // count objects in the size
                });
            }

            break;
        default:
            console.warn(`sizeOf() unknown type: ${typeof obj}`);
            bytes += strBytes(obj.toString());
            break;
    }

    return bytes;
};
