/*
 * Special case of ObjWithCountList for lists of boolean filter options.
 */
import ObjWithCountList from "../api/obj_with_counts_list";
import { BooleanFilterName } from "./boolean_filter";
import { Logger } from '../helpers/logger';
import { BooleanFilterOption } from "../types";
import {
    type ObjWithTootCount,
    type ObjListDataSource,
    type StringNumberDict,
} from "../types";


export default class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {
    constructor(options: BooleanFilterOption[], label: ObjListDataSource) {
        super(options, label);
    }

    // Remove elements that don't match the predicate(). Returns a new TagList object
    filter(predicate: (option: BooleanFilterOption) => boolean): BooleanFilterOptionList {
        return new BooleanFilterOptionList(this.objs.filter(predicate), this.source);
    }

    // Alternate constructor to create synthetic tags
    static buildFromDict<T extends BooleanFilterOption>(dict: StringNumberDict, label: ObjListDataSource): BooleanFilterOptionList {
        const objs: BooleanFilterOption[] = Object.entries(dict).map(([name, numToots]) => {
            const obj: ObjWithTootCount = { name, numToots };
            return obj;
        });

        return new ObjWithCountList(objs, label);
    }
};
