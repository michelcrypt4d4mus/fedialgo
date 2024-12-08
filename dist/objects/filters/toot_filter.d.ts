import { FilterArgs, FilterTitle, Toot } from "../../types";
export default class TootFilter {
    description: string;
    invertSelection: boolean;
    title: FilterTitle;
    visible: boolean;
    constructor({ description, invertSelection, title, visible }: FilterArgs);
    isAllowed(toot: Toot): boolean;
    toArgs(): FilterArgs;
}
