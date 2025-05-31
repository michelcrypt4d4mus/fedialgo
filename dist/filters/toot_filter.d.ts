import Toot from '../api/objects/toot';
import { ComponentLogger } from '../helpers/logger';
import { type FilterArgs, type FilterTitle } from "../types";
export default abstract class TootFilter {
    description: string;
    invertSelection: boolean;
    logger: ComponentLogger;
    title: FilterTitle;
    visible: boolean;
    constructor({ description, invertSelection, title, visible }: FilterArgs);
    abstract isAllowed(toot: Toot): boolean;
    toArgs(): FilterArgs;
}
