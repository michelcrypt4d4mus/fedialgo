"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BytesDict = exports.isNumber = void 0;
/*
 * Math and numbers.
 */
const string_helpers_1 = require("./string_helpers");
// Returns true if it's a digits striing or if it's a number besides NaN or Infinity
const isNumber = (n) => {
    if (typeof n === "string") {
        return string_helpers_1.NUMBER_REGEX.test(n);
    }
    else if (typeof n != "number") {
        return false;
    }
    else {
        return !isNaN(n) && isFinite(n);
    }
};
exports.isNumber = isNumber;
// For use with sizeOf() to try to see internals of object size.
// There's duplication of byte count here - arrays and objects include the other types
class BytesDict {
    arrays = 0;
    booleans = 0;
    functions = 0;
    keys = 0; // keys in objects
    numbers = 0;
    strings = 0;
    objects = 0;
    toDict() {
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
    toBytesStringDict() {
        return Object.fromEntries(Object.entries(this.toDict()).map(([k, v]) => [k, (0, string_helpers_1.byteString)(v)]));
    }
}
exports.BytesDict = BytesDict;
;
//# sourceMappingURL=math_helper.js.map