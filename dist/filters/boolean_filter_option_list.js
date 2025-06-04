"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Special case of ObjWithCountList for lists of boolean filter options.
 */
const obj_with_counts_list_1 = __importDefault(require("../api/obj_with_counts_list"));
class BooleanFilterOptionList extends obj_with_counts_list_1.default {
    constructor(options, label) {
        super(options, label);
    }
    // Remove elements that don't match the predicate(). Returns a new TagList object
    filter(predicate) {
        return new BooleanFilterOptionList(this.objs.filter(predicate), this.source);
    }
    // Alternate constructor to create synthetic tags
    static buildFromDict(dict, label) {
        const objs = Object.entries(dict).map(([name, numToots]) => {
            const obj = { name, numToots };
            return obj;
        });
        return new BooleanFilterOptionList(objs, label);
    }
}
exports.default = BooleanFilterOptionList;
;
//# sourceMappingURL=boolean_filter_option_list.js.map