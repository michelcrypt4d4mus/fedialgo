/*
 * Math and numbers.
 */
import { NUMBER_REGEX } from "./string_helpers";


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
