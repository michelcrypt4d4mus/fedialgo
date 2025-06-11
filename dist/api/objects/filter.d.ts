import { mastodon } from "masto";
export declare function buildMutedRegex(serverSideFilters: mastodon.v2.Filter[]): RegExp;
export declare function extractMutedKeywords(serverSideFilters: mastodon.v2.Filter[]): string[];
