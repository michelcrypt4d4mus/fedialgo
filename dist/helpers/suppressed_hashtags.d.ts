import { type Logger } from "./logger";
import { type StringNumberDict, type TagWithUsageCounts } from "../types";
type DictOfDicts = Record<string, StringNumberDict>;
declare class SuppressedHashtags {
    hashtagCounts: DictOfDicts;
    wasLogged: boolean;
    increment(tag: TagWithUsageCounts): void;
    log(logger: Logger): void;
}
export declare const suppressedHashtags: SuppressedHashtags;
export {};
