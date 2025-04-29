import Toot from "./objects/toot";
import { MastodonServersInfo, TrendingLink, TrendingTag } from "../types";
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
    static fediverseTrendingToots(): Promise<Toot[]>;
    static fediverseTrendingLinks(): Promise<TrendingLink[]>;
    static fediverseTrendingTags(): Promise<TrendingTag[]>;
    static mastodonServersInfo(): Promise<MastodonServersInfo>;
    private static callForAllServers;
    private static callForServers;
}
