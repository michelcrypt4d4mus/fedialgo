import { FilterArgs, FilterTitle, Toot } from "../types";
export default class TootFilter {
    title: FilterTitle;
    description: string;
    invertSelection: boolean;
    visible: boolean;
    constructor({ description, invertSelection, title, visible }: FilterArgs);
    isAllowed(toot: Toot): boolean;
    toArgs(): FilterArgs;
}
