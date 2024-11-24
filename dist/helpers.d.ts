import { mastodon } from "masto";
import { Toot } from "./types";
export declare const isRecord: (x: unknown) => x is Record<string, unknown>;
export declare const _transformKeys: <T>(data: T, transform: (key: string) => string) => T;
export declare const mastodonFetch: <T>(server: string, endpoint: string) => Promise<T | undefined>;
export declare function mastodonFetchPages<T>(fetchMethod: (params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>, min_records?: number): Promise<T[]>;
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
