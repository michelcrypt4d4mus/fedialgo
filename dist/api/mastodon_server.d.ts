import { mastodon } from "masto";
import Toot from "./objects/toot";
import { StringNumberDict, TrendingLink, TrendingTag } from "../types";
export default class MastodonServer {
    domain: string;
    constructor(domain: string);
    fetchTrendingToots(): Promise<Toot[]>;
    fetchTrendingLinks(): Promise<TrendingLink[]>;
    fetchTrendingTags(numTags?: number): Promise<TrendingTag[]>;
    fetchMonthlyUsers(): Promise<number>;
    private fetchList;
    private fetch;
    static fediverseTrendingToots(): Promise<Toot[]>;
    static fediverseTrendingLinks(): Promise<mastodon.v1.TrendLink[]>;
    static mastodonServersInfo(): Promise<StringNumberDict>;
    static callForAllServers<T>(fxn: (server: MastodonServer) => Promise<T>): Promise<Record<string, T>>;
    static callForServers<T>(domains: string[], fxn: (server: MastodonServer) => Promise<T>): Promise<Record<string, T>>;
}
