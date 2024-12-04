import { mastodon } from "masto";
import { Toot } from "./types";
export declare const DEFAULT_RECORDS_PER_PAGE = 40;
export declare const MAX_CONTENT_CHARS = 150;
export declare const IMAGE = "image";
export declare const VIDEO = "video";
export declare const VIDEO_TYPES: string[];
export declare const MEDIA_TYPES: string[];
export declare const IMAGE_EXTENSIONS: string[];
export declare const isRecord: (x: unknown) => x is Record<string, unknown>;
export declare const _transformKeys: <T>(data: T, transform: (key: string) => string) => T;
export declare const mastodonFetch: <T>(server: string, endpoint: string) => Promise<T | undefined>;
interface FetchParams<T> {
    fetchMethod: (params: mastodon.DefaultPaginationParams) => mastodon.Paginator<T[], mastodon.DefaultPaginationParams>;
    maxRecords?: number;
    label?: string;
}
export declare function mastodonFetchPages<T>(fetchParams: FetchParams<T>): Promise<T[]>;
export declare function createRandomString(length: number): string;
export declare function average(values: number[]): number | undefined;
export declare function isImage(uri: string | null | undefined): boolean;
export declare function dedupeToots(toots: Toot[], logLabel?: string | undefined): Toot[];
export declare function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]>;
export {};
