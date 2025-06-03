import ObjWithCountList from "../api/obj_with_counts_list";
import { type BooleanFilterOption, type ObjListDataSource, type StringNumberDict } from "../types";
export default class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {
    constructor(options: BooleanFilterOption[], label: ObjListDataSource);
    filter(predicate: (option: BooleanFilterOption) => boolean): BooleanFilterOptionList;
    static buildFromDict(dict: StringNumberDict, label: ObjListDataSource): BooleanFilterOptionList;
}
