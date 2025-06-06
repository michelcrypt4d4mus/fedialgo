/*
 * Special case of ObjWithCountList for lists of boolean filter options.
 * Only exists for the filter() method to work properly.
 */
import ObjWithCountList from "../api/obj_with_counts_list";
import { BooleanFilterName } from "../enums";
import { type BooleanFilterOption } from "../types";


export default class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {
    constructor(options: BooleanFilterOption[], source: BooleanFilterName) {
        super(options, source);
    }

    // Remove elements that don't match the predicate(). Returns a new TagList object
    // Have to overload this because of typescript's broken alternate constructor handling
    filter(predicate: (option: BooleanFilterOption) => boolean): BooleanFilterOptionList {
        return new BooleanFilterOptionList(this.objs.filter(predicate), this.source as BooleanFilterName);
    }
};
