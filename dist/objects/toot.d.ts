import { mastodon } from "masto";
import { Toot } from "../types";
export declare function popularity(toot: Toot): number;
export declare const condensedStatus: (toot: Toot) => {};
export declare const describeToot: (toot: Toot) => string;
export declare const describeAccount: (toot: Toot) => string;
export declare const imageAttachments: (toot: Toot) => Array<mastodon.v1.MediaAttachment>;
export declare const videoAttachments: (toot: Toot) => Array<mastodon.v1.MediaAttachment>;
export declare const minimumID: (toots: Toot[]) => number | null;
