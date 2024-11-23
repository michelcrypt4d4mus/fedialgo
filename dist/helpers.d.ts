import { mastodon } from "masto";
import { Toot } from "./types";
export declare const isRecord: (x: unknown) => x is Record<string, unknown>;
export declare const _transformKeys: <T>(data: T, transform: (key: string) => string) => T;
export declare const mastodonFetch: <T>(server: string, endpoint: string) => Promise<T | undefined>;
export declare function mastodonFetchPages<T>(fetchMethod: (params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>, min_pages: number, max_records: number): Promise<T[]>;
export declare const condensedStatus: (status: Toot) => {};
export declare const describeAccount: (status: Toot) => string;
