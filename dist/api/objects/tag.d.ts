import Toot from "./toot";
import { MastodonTag, TagNames } from "../../types";
import { StringNumberDict } from "../../types";
export declare function repairTag(tag: MastodonTag): MastodonTag;
export declare function buildTagNames(tags: MastodonTag[]): TagNames;
export declare function countTags(toots: Toot[]): StringNumberDict;
