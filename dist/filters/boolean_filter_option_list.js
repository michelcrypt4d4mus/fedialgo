"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Special case of ObjWithCountList for lists of boolean filter options.
 * Only exists for the filter() method to work properly.
 */
const obj_with_counts_list_1 = __importDefault(require("../api/obj_with_counts_list"));
class BooleanFilterOptionList extends obj_with_counts_list_1.default {
    constructor(options, source) {
        super(options, source);
    }
    // Remove elements that don't match the predicate(). Returns a new TagList object
    // Have to overload this because of typescript's broken alternate constructor handling
    filter(predicate) {
        return new BooleanFilterOptionList(this.objs.filter(predicate), this.source);
    }
}
exports.default = BooleanFilterOptionList;
;
//# sourceMappingURL=boolean_filter_option_list.js.map