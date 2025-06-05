import { isNumber, isNumberOrNumberString } from "../src/helpers/math_helper";


describe('math_helpers', () => {
    it('should detect numbers', async () => {
        expect(isNumber(123)).toBe(true);
        expect(isNumber(0)).toBe(true);
        expect(isNumber(-123)).toBe(true);
        expect(isNumber(NaN)).toBe(false);
        expect(isNumber(Infinity)).toBe(false);
        expect(isNumber(null)).toBe(false);
        expect(isNumber(undefined)).toBe(false);
        expect(isNumberOrNumberString("123")).toBe(true);
        expect(isNumberOrNumberString("0")).toBe(true);
        expect(isNumberOrNumberString("-123")).toBe(true);
        expect(isNumberOrNumberString("NaN")).toBe(false);
        expect(isNumberOrNumberString("Infinity")).toBe(false);
        expect(isNumberOrNumberString("abc")).toBe(false);
        expect(isNumberOrNumberString("")).toBe(false);
        expect(isNumberOrNumberString(null)).toBe(false);
    })
});
