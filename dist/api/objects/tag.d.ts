import { mastodon } from "masto";
import { StringNumberDict } from "../../types";
export declare function repairTag(tag: mastodon.v1.Tag): mastodon.v1.Tag;
export declare function participatedHashtags(): Promise<StringNumberDict>;
