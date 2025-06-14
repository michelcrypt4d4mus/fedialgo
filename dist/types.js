"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILTER_OPTION_DATA_SOURCES = exports.JUST_MUTING = exports.CONVERSATION = void 0;
const enums_1 = require("./enums");
const Storage_1 = require("./Storage");
exports.CONVERSATION = 'conversation';
exports.JUST_MUTING = "justMuting"; // TODO: Ugly hack used in the filter settings to indicate that the user is just muting this toot
const TOOT_SOURCES = [...Storage_1.STORAGE_KEYS_WITH_TOOTS, exports.CONVERSATION, exports.JUST_MUTING];
////////////////////
//    Filters     //
////////////////////
// These server as both Both filter option property names as well as demo app gradient config keys
exports.FILTER_OPTION_DATA_SOURCES = [
    ...Object.values(enums_1.TagTootsCacheKey),
    enums_1.BooleanFilterName.LANGUAGE,
    enums_1.ScoreName.FAVOURITED_ACCOUNTS,
];
;
;
;
;
;
;
;
;
;
;
;
//# sourceMappingURL=types.js.map