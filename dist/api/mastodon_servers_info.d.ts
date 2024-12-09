import { mastodon } from "masto";
import { AccountNames, ServerFeature, TrendingTag } from "../types";
export default function mastodonServersInfo(_api: mastodon.rest.Client, _user: mastodon.v1.Account, followedAccounts: AccountNames): Promise<ServerFeature>;
export declare function getMonthlyUsers(server: string): Promise<number>;
export declare function fetchTrendingTags(server: string, numTags?: number): Promise<TrendingTag[]>;
export declare const mastodonFetch: <T>(server: string, endpoint: string, limit?: number) => Promise<T | undefined>;
