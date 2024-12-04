import { mastodon } from "masto";
import { Toot } from "../types";
export declare const LOG_PREFIX = "[TrendingTags]";
export default function getRecentTootsForTrendingTags(api: mastodon.rest.Client): Promise<Toot[]>;
