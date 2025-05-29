/*
 * Math and numbers.
 */
import { byteString, NUMBER_REGEX } from "./string_helpers";
import { strBytes } from "./log_helpers";
import { StringNumberDict } from "../types";


// Returns true if it's a digits striing or if it's a number besides NaN or Infinity
export const isNumber = (n: string | number): boolean => {
    if (typeof n === "string") {
        return NUMBER_REGEX.test(n);
    } else if (typeof n != "number") {
        return false;
    } else {
        return !isNaN(n) && isFinite(n);
    }
};


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
