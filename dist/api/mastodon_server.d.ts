import TagList from "./tag_list";
import Toot from "./objects/toot";
import { Logger } from '../helpers/logger';
import { type MastodonInstance, type MastodonInstances, type TagWithUsageCounts, type TrendingLink, type TrendingData } from "../types";
export type InstanceResponse = MastodonInstance | null;
export default class MastodonServer {
    domain: string;
    logger: Logger;
    private static v1Url;
    private static v2Url;
    private static trendUrl;
    constructor(domain: string);
    fetchServerInfo(): Promise<InstanceResponse>;
    fetchTrendingStatuses(): Promise<Toot[]>;
    fetchTrendingLinks(): Promise<TrendingLink[]>;
    fetchTrendingTags(): Promise<TagWithUsageCounts[]>;
    private fetch;
    private fetchList;
    private fetchTrending;
    static fediverseTrendingLinks(): Promise<TrendingLink[]>;
    static fediverseTrendingTags(): Promise<TagList>;
    static fediverseTrendingToots(): Promise<Toot[]>;
    static getMastodonInstancesInfo(): Promise<MastodonInstances>;
    static getTrendingData(): Promise<TrendingData>;
    private static fetchMastodonInstances;
    private static fetchTrendingObjsFromAllServers;
    private static getTopServerDomains;
    private static callForServers;
    private static callForTopServers;
    private endpointUrl;
    private static isNoMauServer;
}
