import Toot from "./objects/toot";
import { StringNumberDict, TrendingTag } from "../types";
export declare function mastodonServersInfo(): Promise<StringNumberDict>;
export declare function fetchTrendingTags(server: string, numTags?: number): Promise<TrendingTag[]>;
export declare function fetchTrendingToots(): Promise<Toot[]>;
