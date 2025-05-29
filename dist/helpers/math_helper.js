"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sizeOf = exports.sizeFromBufferByteLength = exports.sizeFromTextEncoder = exports.BytesDict = exports.isNumber = void 0;
/*
 * Math and numbers.
 */
const string_helpers_1 = require("./string_helpers");
const collection_helpers_1 = require("./collection_helpers");
const log_helpers_1 = require("./log_helpers");
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
function sizeFromTextEncoder(obj) {
    try {
        return new TextEncoder().encode(JSON.stringify(obj)).length;
    }
    catch (err) {
        console.error("sizeFromBufferByteLength() failed to encode object with error:", err, `\nobject:`, obj);
        return 0;
    }
}
exports.sizeFromTextEncoder = sizeFromTextEncoder;
;
function sizeFromBufferByteLength(obj) {
    try {
        return Buffer.byteLength(JSON.stringify(obj), 'utf8');
    }
    catch (err) {
        console.error("sizeFromBufferByteLength() failed to encode object with error:", err, `\nobject:`, obj);
        return 0;
    }
}
exports.sizeFromBufferByteLength = sizeFromBufferByteLength;
;
// Not 100% accurate. From https://gist.github.com/rajinwonderland/36887887b8a8f12063f1d672e318e12e
function sizeOf(obj, sizes) {
    if (obj === null || obj === undefined)
        return 0;
    let bytes = 0;
    switch (typeof obj) {
        case "number":
            bytes += 8;
            sizes.numbers += 8;
            break;
        case "string":
            const stringLength = (0, log_helpers_1.strBytes)(obj);
            bytes += stringLength;
            sizes.strings += stringLength;
            break;
        case "boolean":
            bytes += 4;
            sizes.booleans += 4;
            break;
        case "function":
            const fxnLength = (0, log_helpers_1.strBytes)(obj.toString());
            bytes += fxnLength; // functions aren't serialized in JSON i don't think?
            sizes.functions += fxnLength;
            break;
        case "object":
            if (Array.isArray(obj)) {
                const arrayBytes = (0, collection_helpers_1.sumArray)(obj.map((item) => sizeOf(item, sizes)));
                bytes += arrayBytes;
                sizes.arrays += arrayBytes;
            }
            else {
                Object.entries(obj).forEach(([key, value]) => {
                    const keyBytes = (0, log_helpers_1.strBytes)(key);
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
            bytes += (0, log_helpers_1.strBytes)(obj.toString());
            break;
    }
    return bytes;
}
exports.sizeOf = sizeOf;
;
//# sourceMappingURL=math_helper.js.map