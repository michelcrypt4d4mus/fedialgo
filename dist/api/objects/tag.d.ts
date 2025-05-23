import Toot from "./toot";
import { MastodonTag, StringNumberDict, TagNames } from "../../types";
export declare function buildTagNames(tags: MastodonTag[]): TagNames;
export declare function countTags(toots: Toot[]): StringNumberDict;
export declare function repairTag(tag: MastodonTag): MastodonTag;
