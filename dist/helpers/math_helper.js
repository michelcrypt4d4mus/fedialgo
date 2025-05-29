"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNumber = void 0;
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
//# sourceMappingURL=math_helper.js.map