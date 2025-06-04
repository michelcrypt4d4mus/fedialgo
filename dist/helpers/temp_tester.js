"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILTER_OPTION_DATA_SOURCES = void 0;
const enums_1 = require("../enums");
const boolean_filter_1 = require("../filters/boolean_filter");
// These server as both Both filter option property names as well as demo app gradient config keys
exports.FILTER_OPTION_DATA_SOURCES = [
    ...Object.values(enums_1.TagTootsCacheKey),
    boolean_filter_1.BooleanFilterName.LANGUAGE,
    enums_1.ScoreName.FAVOURITED_ACCOUNTS,
];
//# sourceMappingURL=temp_tester.js.map