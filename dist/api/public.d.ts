import { mastodon } from "masto";
import Toot from "./objects/toot";
import { StringNumberDict, TrendingTag } from "../types";
export declare function mastodonServersInfo(follows: mastodon.v1.Account[]): Promise<StringNumberDict>;
export declare function fetchTrendingTags(server: string, numTags?: number): Promise<TrendingTag[]>;
export declare function fetchTrendingToots(): Promise<Toot[]>;
