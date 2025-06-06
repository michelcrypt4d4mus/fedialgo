import ObjWithCountList from "../api/obj_with_counts_list";
import { BooleanFilterName } from "../enums";
import { type BooleanFilterOption } from "../types";
export default class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {
    constructor(options: BooleanFilterOption[], source: BooleanFilterName);
    filter(predicate: (option: BooleanFilterOption) => boolean): BooleanFilterOptionList;
}
