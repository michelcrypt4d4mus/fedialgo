import { mastodon } from "masto";
import { Toot, TrendingTag } from "../types";
export default function getTrendingTags(api: mastodon.rest.Client): Promise<TrendingTag[]>;
export declare function getRecentTootsForTrendingTags(api: mastodon.rest.Client, tags: TrendingTag[]): Promise<Toot[]>;
