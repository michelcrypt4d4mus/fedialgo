import { mastodon } from "masto";
import { Toot } from "./types";
export declare const DEFAULT_RECORDS_PER_PAGE = 40;
export declare const VIDEO_TYPES: string[];
export declare const MEDIA_TYPES: string[];
export declare const isRecord: (x: unknown) => x is Record<string, unknown>;
export declare const _transformKeys: <T>(data: T, transform: (key: string) => string) => T;
export declare const mastodonFetch: <T>(server: string, endpoint: string) => Promise<T | undefined>;
interface FetchParams<T> {
    fetchMethod: (params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>;
    minRecords?: number;
    label?: string;
}
export declare function mastodonFetchPages<T>({ fetchMethod, minRecords, label }: FetchParams<T>): Promise<T[]>;
export declare const condensedStatus: (toot: Toot) => {};
export declare const extractScoreInfo: (toot: Toot) => {
    rawScore: number | undefined;
    scoreComponents: import("./types").ScoresType | undefined;
    scoreComponentsWeighted: import("./types").ScoresType | undefined;
    timeDecayMultiplier: number | undefined;
    timeWeightedScore: number | undefined;
};
export declare const describeAccount: (toot: Toot) => string;
export declare const describeToot: (toot: Toot) => string;
export declare const imageAttachments: (toot: Toot) => Array<mastodon.v1.MediaAttachment>;
export declare const videoAttachments: (toot: Toot) => Array<mastodon.v1.MediaAttachment>;
export declare const minimumID: (toots: Toot[]) => number | null;
export {};
