import { mastodon } from "masto";
import Toot from "./objects/toot";
import { MastodonServersInfo, TrendingLink, TrendingStorage, TrendingTag } from "../types";
export declare enum FediverseTrendingType {
    STATUSES = "statuses",
    LINKS = "links",
    TAGS = "tags"
}
type InstanceResponse = mastodon.v2.Instance | null;
export default class MastodonServer {
    domain: string;
    static v1Url: (path: string) => string;
    static v2Url: (path: string) => string;
    static trendUrl: (path: string) => string;
    constructor(domain: string);
    fetchServerInfo(): Promise<InstanceResponse>;
    fetchTrendingToots(): Promise<Toot[]>;
    fetchTrendingLinks(): Promise<TrendingLink[]>;
    fetchTrendingTags(): Promise<TrendingTag[]>;
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
export {};
