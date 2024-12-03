import { mastodon } from "masto";
import { Toot, TrendingTag } from "../types";
export declare function getRecentTootsForTrendingTags(api: mastodon.rest.Client): Promise<Toot[]>;
export default function getTrendingTags(api: mastodon.rest.Client): Promise<TrendingTag[]>;
