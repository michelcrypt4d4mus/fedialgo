import Toot from '../api/objects/toot';
import { FilterArgs, FilterTitle } from "../types";
export default abstract class TootFilter {
    description: string;
    invertSelection: boolean;
    title: FilterTitle;
    visible: boolean;
    constructor({ description, invertSelection, title, visible }: FilterArgs);
    abstract isAllowed(toot: Toot): boolean;
    toArgs(): FilterArgs;
}
