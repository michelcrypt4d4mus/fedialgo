"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sizeOf = exports.sizeFromBufferByteLength = exports.sizeFromTextEncoder = exports.isNumberOrNumberString = exports.BytesDict = void 0;
/*
 * Math and numbers.
 */
const lodash_1 = require("lodash");
const string_helpers_1 = require("./string_helpers");
const collection_helpers_1 = require("./collection_helpers");
const NUMBER_REGEX = /^[\d.]+$/;
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
// Same as isNumber() but accepts a numerical string as well
const isNumberOrNumberString = (n) => {
    return typeof n == "string" ? NUMBER_REGEX.test(n) : (0, lodash_1.isFinite)(n);
};
exports.isNumberOrNumberString = isNumberOrNumberString;
// Use TextEncoder to get the byte length of an object
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
// Use Buffer to get the byte length of an object
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
    if ((0, lodash_1.isNil)(obj))
        return 0;
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
                const arrayBytes = (0, collection_helpers_1.sumArray)(obj.map((item) => sizeOf(item, sizes)));
                bytes += arrayBytes;
                sizes.arrays += arrayBytes;
            }
            else {
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
}
exports.sizeOf = sizeOf;
;
// Roughly, assuming UTF-8 encoding. UTF-16 would be 2x this, emojis are 4 bytes, etc.
const strBytes = (str) => str.length;
//# sourceMappingURL=math_helper.js.map