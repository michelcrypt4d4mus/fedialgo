import { AccountNames, ServerFeature, TrendingTag } from "../types";
export default function mastodonServersInfo(followedAccounts: AccountNames): Promise<ServerFeature>;
export declare function getMonthlyUsers(server: string): Promise<number>;
export declare function fetchTrendingTags(server: string, numTags?: number): Promise<TrendingTag[]>;
export declare const mastodonFetch: <T>(server: string, endpoint: string, limit?: number) => Promise<T | undefined>;
