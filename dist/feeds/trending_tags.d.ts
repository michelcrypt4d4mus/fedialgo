import { mastodon } from "masto";
import { Toot } from "../types";
export default function getRecentTootsForTrendingTags(api: mastodon.rest.Client): Promise<Toot[]>;
