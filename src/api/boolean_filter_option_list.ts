/**
 * @module Filters
 */
import ObjWithCountList from "./obj_with_counts_list";
import type { BooleanFilterOption } from "../types";


/**
 * Special case of ObjWithCountList for BooleanFilterOption objects.
 * @extends {ObjWithCountList}
 */
export default class BooleanFilterOptionList extends ObjWithCountList<BooleanFilterOption> {};
