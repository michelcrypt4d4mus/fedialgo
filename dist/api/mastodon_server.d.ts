import { mastodon } from "masto";
import Toot from "./objects/toot";
import { StringNumberDict, TrendingTag } from "../types";
export default class MastodonServer {
    domain: string;
    constructor(domain: string);
    fetchTrendingTags(numTags?: number): Promise<TrendingTag[]>;
    fetchTrendingToots(): Promise<Toot[]>;
    fetchMonthlyUsers(): Promise<number>;
    fetchTrendingLinks(): Promise<mastodon.v1.TrendLink[]>;
    private fetch;
    static fediverseTrendingToots(): Promise<Toot[]>;
    static fediverseTrendingLinks(): Promise<mastodon.v1.TrendLink[]>;
    static mastodonServersInfo(): Promise<StringNumberDict>;
    static callForAllServers<T>(fxn: (server: MastodonServer) => Promise<T>): Promise<Record<string, T>>;
    static callForServers<T>(domains: string[], fxn: (server: MastodonServer) => Promise<T>): Promise<Record<string, T>>;
}
