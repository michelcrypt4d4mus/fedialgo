import Toot from "./objects/toot";
import { StringNumberDict, TrendingTag } from "../types";
export declare class MastodonServer {
    domain: string;
    constructor(domain: string);
    fetchTrendingTags(numTags?: number): Promise<TrendingTag[]>;
    trendingToots(): Promise<Toot[] | undefined>;
    getMonthlyUsers(): Promise<number>;
    private fetch;
    static fetchTrendingToots(): Promise<Toot[]>;
    static mastodonServersInfo(): Promise<StringNumberDict>;
}
