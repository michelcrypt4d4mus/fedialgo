import Toot from '../api/objects/toot';
import { Logger } from '../helpers/logger';
import { type FilterArgs, type FilterTitle } from "../types";
export default abstract class TootFilter {
    description: string;
    invertSelection: boolean;
    logger: Logger;
    title: FilterTitle;
    visible: boolean;
    constructor({ description, invertSelection, title, visible }: FilterArgs);
    abstract isAllowed(toot: Toot): boolean;
    toArgs(): FilterArgs;
}
