import Toot from "./objects/toot";
import { MastodonInstance, MastodonInstances, TagWithUsageCounts, TrendingLink, TrendingStorage } from "../types";
export declare enum TrendingType {
    STATUSES = "statuses",
    LINKS = "links",
    TAGS = "tags"
}
type InstanceResponse = MastodonInstance | null;
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
    fetchTrendingTags(): Promise<TagWithUsageCounts[]>;
    private fetchTrending;
    private fetchList;
    private fetch;
    static getTrendingData(): Promise<TrendingStorage>;
    static fediverseTrendingLinks(): Promise<TrendingLink[]>;
    static fediverseTrendingTags(): Promise<TagWithUsageCounts[]>;
    static fediverseTrendingToots(): Promise<Toot[]>;
    static getMastodonInstancesInfo(): Promise<MastodonInstances>;
    private static fetchMastodonInstances;
    private static fetchTrendingObjsFromAllServers;
    private static getTopServerDomains;
    private static callForAllServers;
    private static callForServers;
    private static isNoMauServer;
}
export {};
