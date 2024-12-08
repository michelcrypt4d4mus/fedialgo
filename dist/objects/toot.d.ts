import { mastodon } from "masto";
import { Toot } from "../types";
export declare const EARLIEST_TIMESTAMP: Date;
export declare function popularity(toot: Toot): number;
export declare const condensedStatus: (toot: Toot) => {};
export declare const describeToot: (toot: Toot) => string;
export declare const describeAccount: (toot: Toot) => string;
export declare const describeTootTime: (toot: Toot) => string;
export declare const imageAttachments: (toot: Toot) => Array<mastodon.v1.MediaAttachment>;
export declare const videoAttachments: (toot: Toot) => Array<mastodon.v1.MediaAttachment>;
export declare const minimumID: (toots: Toot[]) => number | null;
export declare const sortByCreatedAt: (toots: Toot[]) => Toot[];
export declare const earliestTootAt: (toots: Toot[]) => Date | null;
export declare const earliestToot: (toots: Toot[]) => Toot | null;
export declare function repairToot(toot: Toot): void;
export declare const tootedAt: (toot: Toot) => Date;
export declare function containsString(toot: Toot, str: string): boolean;
