import { mastodon } from "masto";
import { StringNumberDict, TrendingTag } from "../types";
export declare function mastodonServersInfo(follows: mastodon.v1.Account[]): Promise<StringNumberDict>;
export declare function fetchTrendingTags(server: string, numTags?: number): Promise<TrendingTag[]>;
export declare const mastodonFetch: <T>(server: string, endpoint: string, limit?: number) => Promise<T | undefined>;
