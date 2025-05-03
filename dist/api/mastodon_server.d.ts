import Toot from "./objects/toot";
import { InstanceResponse, MastodonInstances, TrendingLink, TrendingStorage, TrendingTag } from "../types";
export declare enum FediverseTrendingType {
    STATUSES = "statuses",
    LINKS = "links",
    TAGS = "tags"
}
export default class MastodonServer {
    domain: string;
    private static v1Url;
    private static v2Url;
    private static trendUrl;
    private endpointDomain;
    private endpointUrl;
    constructor(domain: string);
    fetchServerInfo(): Promise<InstanceResponse>;
    fetchTrendingStatuses(): Promise<Toot[]>;
    fetchTrendingLinks(): Promise<TrendingLink[]>;
    fetchTrendingTags(): Promise<TrendingTag[]>;
    private fetchTrending;
    private fetchList;
    private fetch;
    static getTrendingData(): Promise<TrendingStorage>;
    static fediverseTrendingToots(): Promise<Toot[]>;
    static fediverseTrendingLinks(): Promise<TrendingLink[]>;
    static fediverseTrendingTags(): Promise<TrendingTag[]>;
    static getMastodonInstancesInfo(): Promise<MastodonInstances>;
    private static fetchMastodonInstances;
    private static getTopServerDomains;
    private static fetchTrendingFromAllServers;
    private static callForAllServers;
    private static callForServers;
}
