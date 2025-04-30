import Toot from "./objects/toot";
import { MastodonServersInfo, TrendingLink, TrendingStorage, TrendingTag } from "../types";
export declare enum FediverseTrendingType {
    STATUSES = "statuses",
    LINKS = "links",
    TAGS = "tags"
}
export default class MastodonServer {
    domain: string;
    constructor(domain: string);
    fetchTrendingToots(): Promise<Toot[]>;
    fetchTrendingLinks(): Promise<TrendingLink[]>;
    fetchTrendingTags(): Promise<TrendingTag[]>;
    fetchMonthlyUsers(): Promise<number>;
    private fetchTrending;
    private fetchList;
    private fetch;
    static getTrendingData(): Promise<TrendingStorage>;
    static fediverseTrendingToots(): Promise<Toot[]>;
    static fediverseTrendingLinks(): Promise<TrendingLink[]>;
    static fediverseTrendingTags(): Promise<TrendingTag[]>;
    static getMastodonServersInfo(): Promise<MastodonServersInfo>;
    private static fetchMastodonServersInfo;
    private static getTopServerDomains;
    private static fetchTrendingFromAllServers;
    private static callForAllServers;
    private static callForServers;
}
